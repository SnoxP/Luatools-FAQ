import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Bot, User, Loader2, AlertCircle } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { useFaq } from '../context/FaqContext';
import DiscordMarkdown from './DiscordMarkdown';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

let aiInstance: GoogleGenAI | null = null;

const getAI = () => {
  if (!aiInstance) {
    // Try process.env first (AI Studio), then fallback to VITE_ (Vercel)
    const apiKey = process.env.GEMINI_API_KEY || (import.meta as any).env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      console.error("GEMINI_API_KEY is missing. Chatbot will not work.");
      return null;
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
};

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
}

export default function Chatbot() {
  const { faqData } = useFaq();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      text: 'Olá! 👋 Sou o assistente virtual do LuaTools. Como posso te ajudar hoje? (Lembrando que minhas respostas são baseadas no nosso FAQ oficial, ok?)'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<any>(null);

  // Reset chat session when FAQ data changes so the bot gets the updated system instruction
  useEffect(() => {
    chatRef.current = null;
  }, [faqData]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput('');
    
    const newUserMsg: Message = { id: Date.now().toString(), role: 'user', text: userText };
    setMessages(prev => [...prev, newUserMsg]);
    setIsLoading(true);

    try {
      const systemInstruction = `Você é o assistente virtual amigável do servidor Discord 'LuaTools'.
      Seu objetivo é ajudar os usuários respondendo dúvidas com base no seguinte FAQ:
      ${JSON.stringify(faqData)}

      REGRAS:
      1. Seja educado, amigável e humano. Se o usuário apenas disser "oi", "olá", "bom dia", etc., responda de forma acolhedora e pergunte como pode ajudar.
      2. Para dúvidas técnicas, responda APENAS com base no FAQ fornecido. Não invente informações.
      3. Se a dúvida técnica não estiver no FAQ, responda de forma educada que não encontrou a resposta e sugira abrir um ticket no Discord. Exemplo: "Poxa, não encontrei essa informação no nosso FAQ. Mas não se preocupe! Você pode abrir um ticket no nosso servidor do Discord para a equipe te ajudar melhor."
      4. Sempre que usar uma informação do FAQ, cite a seção (ex: 1A, 2B).
      5. Seja claro, direto e use emojis para deixar a conversa mais leve.
      6. Quando responder a uma dúvida do FAQ, sugira 1 ou 2 perguntas relacionadas no final.`;

      const ai = getAI();
      if (!ai) {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'model',
          text: '⚠️ Erro de Configuração: A chave da API do Gemini não foi encontrada. Se você está hospedando este site na Vercel, certifique-se de adicionar a variável de ambiente VITE_GEMINI_API_KEY.'
        }]);
        setIsLoading(false);
        return;
      }

      if (!chatRef.current) {
        chatRef.current = ai.chats.create({
          model: 'gemini-3-flash-preview',
          config: {
            systemInstruction,
            temperature: 0.4, // Slightly higher temperature for more natural, human-like responses
          }
        });
      }

      // Check bot limits
      try {
        const today = new Date().toLocaleDateString('pt-BR');
        const botRef = doc(db, 'content', 'bot_settings');
        const botSnap = await getDoc(botRef);
        
        if (botSnap.exists()) {
          const data = botSnap.data();
          const globalLimit = data.dailyLimit || 100;
          const userLimit = data.userDailyLimit || 10;
          const currentGens = data.lastResetDate === today ? (data.dailyGenerations || 0) : 0;
          
          // Check global limit
          if (currentGens >= globalLimit) {
            setMessages(prev => [...prev, {
              id: Date.now().toString(),
              role: 'model',
              text: '⚠️ O limite diário global de respostas do bot foi atingido. Por favor, tente novamente amanhã ou abra um ticket no Discord.'
            }]);
            setIsLoading(false);
            return;
          }

          // Check user limit
          const userUsageData = localStorage.getItem('bot_usage');
          let userUsage = userUsageData ? JSON.parse(userUsageData) : { date: today, count: 0 };
          
          if (userUsage.date !== today) {
            userUsage = { date: today, count: 0 };
          }

          if (userUsage.count >= userLimit) {
            setMessages(prev => [...prev, {
              id: Date.now().toString(),
              role: 'model',
              text: `⚠️ Você atingiu sua cota diária de ${userLimit} perguntas. Por favor, tente novamente amanhã ou abra um ticket no Discord.`
            }]);
            setIsLoading(false);
            return;
          }
          
          // Increment global
          await updateDoc(botRef, {
            dailyGenerations: currentGens + 1,
            lastResetDate: today
          });

          // Increment user
          userUsage.count += 1;
          localStorage.setItem('bot_usage', JSON.stringify(userUsage));

        } else {
          // Create default
          await setDoc(botRef, {
            dailyLimit: 100,
            userDailyLimit: 10,
            dailyGenerations: 1,
            lastResetDate: today
          });
          localStorage.setItem('bot_usage', JSON.stringify({ date: today, count: 1 }));
        }
      } catch (e) {
        console.error("Error checking bot limits", e);
        // Continue anyway if there's an error reading/writing limits
      }

      const response = await chatRef.current.sendMessage({ message: userText });
      
      const newModelMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: response.text || 'Ocorreu um erro ao processar a resposta.'
      };

      setMessages(prev => [...prev, newModelMsg]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        text: 'Desculpe, ocorreu um erro ao conectar com a IA. Por favor, tente novamente mais tarde.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30 hover:bg-indigo-500 hover:scale-110 transition-all z-50"
          >
            <MessageSquare className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="fixed bottom-6 right-6 w-[90vw] sm:w-[400px] h-[600px] max-h-[80vh] bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-600/20 flex items-center justify-center text-indigo-400">
                  <Bot className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-white font-medium">Assistente LuaTools</h3>
                  <p className="text-xs text-emerald-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    Online
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-3 ${
                      msg.role === 'user'
                        ? 'bg-indigo-600 text-white rounded-tr-sm'
                        : 'bg-zinc-800 text-zinc-200 rounded-tl-sm'
                    }`}
                  >
                    <DiscordMarkdown className="text-sm leading-relaxed">
                      {msg.text}
                    </DiscordMarkdown>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-zinc-800 text-zinc-400 rounded-2xl rounded-tl-sm p-4 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Pensando...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-zinc-800 bg-zinc-900">
              <form onSubmit={handleSubmit} className="relative flex items-center">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Digite sua dúvida..."
                  disabled={isLoading}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-full pl-4 pr-12 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="absolute right-2 p-2 rounded-full bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
              <div className="mt-2 text-center">
                <a
                  href="https://discord.gg/luatools"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-zinc-500 hover:text-indigo-400 transition-colors flex items-center justify-center gap-1"
                >
                  <AlertCircle className="w-3 h-3" />
                  Não encontrou? Abra um ticket no Discord
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
