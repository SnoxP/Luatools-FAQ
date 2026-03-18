import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Bot, User, Loader2, AlertCircle } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { useFaq } from '../context/FaqContext';

let aiInstance: GoogleGenAI | null = null;

const getAI = () => {
  if (!aiInstance) {
    // Try process.env first (AI Studio), then fallback to VITE_ (Vercel)
    const apiKey = process.env.GEMINI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY;
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
      text: 'Olá! Sou o assistente virtual do LuaTools. Como posso ajudar você hoje? (Respondo apenas dúvidas baseadas no nosso FAQ oficial).'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
      const systemInstruction = `Você é o assistente virtual do servidor Discord 'LuaTools'.
      Responda APENAS com base no seguinte FAQ:
      ${JSON.stringify(faqData)}

      REGRAS:
      1. Não invente informações. Se a resposta não estiver no FAQ, diga EXATAMENTE: 'Não encontrei isso no FAQ. Deseja abrir um ticket no Discord?'.
      2. Sempre cite a seção (ex: 1A, 2B) quando usar uma informação.
      3. Seja claro e direto.
      4. Sugira 1 ou 2 perguntas relacionadas no final.
      5. Formate as respostas com quebras de linha e emojis para facilitar a leitura.`;

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

      const chat = ai.chats.create({
        model: 'gemini-3-flash-preview',
        config: {
          systemInstruction,
          temperature: 0.2, // Low temperature for more deterministic/factual answers
        }
      });

      // Send chat history
      for (const msg of messages.slice(1)) { // Skip welcome message
        await chat.sendMessage({ message: msg.text });
      }

      const response = await chat.sendMessage({ message: userText });
      
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
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                      {msg.text}
                    </div>
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
