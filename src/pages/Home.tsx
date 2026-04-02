import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Bot, Loader2, AlertCircle, Image as ImageIcon, X } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { useFaq } from '../context/FaqContext';
import DiscordMarkdown from '../components/DiscordMarkdown';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

let aiInstance: GoogleGenAI | null = null;

const getAI = () => {
  if (!aiInstance) {
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
  image?: { data: string; mimeType: string };
}

export default function Home() {
  const { faqData } = useFaq();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      text: 'Olá! 👋 Sou o assistente virtual do LuaTools. Como posso te ajudar hoje? (Lembrando que minhas respostas são baseadas no nosso FAQ oficial, ok?)'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ data: string; mimeType: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    chatRef.current = null;
  }, [faqData]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!input.trim() && !selectedImage) || isLoading) return;

    const userText = input.trim();
    setInput('');
    
    const newUserMsg: Message = { 
      id: Date.now().toString(), 
      role: 'user', 
      text: userText,
      image: selectedImage || undefined
    };
    
    const currentMessages = [...messages, newUserMsg];
    setMessages(currentMessages);
    setIsLoading(true);
    setSelectedImage(null);

    try {
      const systemInstruction = `Você é o assistente virtual amigável e especialista do servidor Discord 'LuaTools'.
      Seu objetivo é ajudar os usuários respondendo dúvidas com base no seguinte FAQ:
      ${JSON.stringify(faqData)}

      REGRAS:
      1. Seja educado, amigável e humano. Se o usuário apenas disser "oi", "olá", "bom dia", etc., responda de forma acolhedora e pergunte como pode ajudar.
      2. Para dúvidas técnicas gerais, priorize responder com base no FAQ fornecido.
      3. Se a dúvida técnica não estiver no FAQ, NÃO diga apenas que não sabe. Tente deduzir o problema usando seu conhecimento geral de programação/sistemas e forneça alternativas ou passos de troubleshooting que possam resolver a situação. Apenas se for algo muito específico e sem solução aparente, sugira pedir ajuda no servidor.
      4. Sempre que usar uma informação do FAQ, cite a seção (ex: 1A, 2B).
      5. Seja claro, direto e use emojis para deixar a conversa mais leve.
      6. Quando responder a uma dúvida do FAQ, sugira 1 ou 2 perguntas relacionadas no final.
      7. ANÁLISE DE IMAGENS: Se o usuário enviar uma imagem, aja como um desenvolvedor sênior investigando um bug. Analise a imagem detalhadamente, pense passo a passo sobre o que está visível (erros de sintaxe, logs, interface), identifique a causa raiz e forneça uma explicação técnica aprofundada com possíveis soluções (mesmo que não estejam no FAQ).`;

      const ai = getAI();
      if (!ai) {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'model',
          text: '⚠️ Erro de Configuração: A chave da API do Gemini não foi encontrada.'
        }]);
        setIsLoading(false);
        return;
      }

      try {
        const today = new Date().toLocaleDateString('pt-BR');
        const botRef = doc(db, 'content', 'bot_settings');
        const botSnap = await getDoc(botRef);
        
        if (botSnap.exists()) {
          const data = botSnap.data();
          const globalLimit = data.dailyLimit || 100;
          const userLimit = data.userDailyLimit || 10;
          const rpmLimit = data.rpmLimit || 15;
          const currentGens = data.lastResetDate === today ? (data.dailyGenerations || 0) : 0;
          
          if (currentGens >= globalLimit) {
            setMessages(prev => [...prev, {
              id: Date.now().toString(),
              role: 'model',
              text: '⚠️ O limite diário global de respostas do bot foi atingido. Por favor, tente novamente amanhã ou peça ajuda no servidor.'
            }]);
            setIsLoading(false);
            return;
          }

          const now = Date.now();
          const rpmUsageData = localStorage.getItem('bot_rpm_usage');
          let rpmUsage: number[] = rpmUsageData ? JSON.parse(rpmUsageData) : [];
          rpmUsage = rpmUsage.filter(timestamp => now - timestamp < 60000);

          if (rpmUsage.length >= rpmLimit) {
            setMessages(prev => [...prev, {
              id: Date.now().toString(),
              role: 'model',
              text: `⚠️ Você está enviando mensagens rápido demais. O limite é de ${rpmLimit} por minuto. Aguarde um instante.`
            }]);
            setIsLoading(false);
            return;
          }

          const userUsageData = localStorage.getItem('bot_usage');
          let userUsage = userUsageData ? JSON.parse(userUsageData) : { date: today, count: 0 };
          
          if (userUsage.date !== today) {
            userUsage = { date: today, count: 0 };
          }

          if (userUsage.count >= userLimit) {
            setMessages(prev => [...prev, {
              id: Date.now().toString(),
              role: 'model',
              text: `⚠️ Você atingiu sua cota diária de ${userLimit} perguntas. Por favor, tente novamente amanhã ou peça ajuda no servidor.`
            }]);
            setIsLoading(false);
            return;
          }
          
          await updateDoc(botRef, {
            dailyGenerations: currentGens + 1,
            lastResetDate: today
          });

          userUsage.count += 1;
          localStorage.setItem('bot_usage', JSON.stringify(userUsage));

          rpmUsage.push(now);
          localStorage.setItem('bot_rpm_usage', JSON.stringify(rpmUsage));

        } else {
          await setDoc(botRef, {
            dailyLimit: 100,
            userDailyLimit: 10,
            rpmLimit: 15,
            dailyGenerations: 1,
            lastResetDate: today
          });
          localStorage.setItem('bot_usage', JSON.stringify({ date: today, count: 1 }));
        }
      } catch (e) {
        console.error("Error checking bot limits", e);
      }

      const historyMessages = currentMessages.filter(m => m.id !== 'welcome');
      
      const contents = historyMessages.map(m => {
        const parts: any[] = [];
        if (m.text) {
          parts.push({ text: m.text });
        }
        if (m.image) {
          parts.push({ inlineData: { data: m.image.data, mimeType: m.image.mimeType } });
        }
        if (parts.length === 1 && m.image) {
           parts.unshift({ text: "Analise esta imagem." });
        }
        return {
          role: m.role,
          parts
        };
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents,
        config: {
          systemInstruction,
          temperature: 0.4,
        }
      });
      
      const newModelMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: response.text || 'Ocorreu um erro ao processar a resposta.'
      };

      setMessages(prev => [...prev, newModelMsg]);
    } catch (error: any) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        text: `⚠️ Erro: ${error.message || 'Desculpe, ocorreu um erro ao conectar com a IA.'}`
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const data = (event.target?.result as string).split(',')[1];
      setSelectedImage({ data, mimeType: file.type });
    };
    reader.readAsDataURL(file);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (!file) continue;

        const reader = new FileReader();
        reader.onload = (event) => {
          const data = (event.target?.result as string).split(',')[1];
          setSelectedImage({ data, mimeType: file.type });
        };
        reader.readAsDataURL(file);
        break;
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#212121]">
      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto w-full">
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'model' && (
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0 mt-1">
                  <Bot className="w-5 h-5 text-zinc-200" />
                </div>
              )}
              <div
                className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-5 py-3.5 ${
                  msg.role === 'user'
                    ? 'bg-[#2f2f2f] text-zinc-100'
                    : 'text-zinc-200'
                }`}
              >
                {msg.image && (
                  <img 
                    src={`data:${msg.image.mimeType};base64,${msg.image.data}`} 
                    alt="Uploaded" 
                    className="max-w-full rounded-xl mb-3 border border-white/10"
                    referrerPolicy="no-referrer"
                  />
                )}
                <DiscordMarkdown className="text-[15px] leading-relaxed">
                  {msg.text}
                </DiscordMarkdown>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-4 justify-start">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0 mt-1">
                <Bot className="w-5 h-5 text-zinc-200" />
              </div>
              <div className="text-zinc-400 px-5 py-3.5 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-[15px]">Pensando...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} className="h-4" />
        </div>
      </div>

      {/* Input Area */}
      <div className="w-full max-w-3xl mx-auto px-4 pb-6 pt-2">
        <div className="relative bg-[#2f2f2f] rounded-3xl border border-white/10 shadow-lg focus-within:border-white/20 transition-colors">
          {selectedImage && (
            <div className="absolute bottom-full left-0 mb-3 ml-4">
              <div className="relative inline-block">
                <img 
                  src={`data:${selectedImage.mimeType};base64,${selectedImage.data}`} 
                  alt="Preview" 
                  className="h-16 rounded-lg border border-white/10 object-cover"
                  referrerPolicy="no-referrer"
                />
                <button
                  type="button"
                  onClick={() => setSelectedImage(null)}
                  className="absolute -top-2 -right-2 bg-zinc-800 text-zinc-400 hover:text-white rounded-full p-1 border border-zinc-700 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
          <form onSubmit={handleSubmit} className="flex items-end gap-2 p-2">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              ref={fileInputRef}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-3 text-zinc-400 hover:text-zinc-200 transition-colors rounded-full hover:bg-white/5 shrink-0"
            >
              <ImageIcon className="w-5 h-5" />
            </button>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder={selectedImage ? "Imagem selecionada..." : "Pergunte algo ao LuaTools..."}
              disabled={isLoading}
              rows={1}
              className="w-full bg-transparent border-none resize-none text-[15px] text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-0 py-3 max-h-32 overflow-y-auto disabled:opacity-50"
              style={{ minHeight: '44px' }}
            />
            <button
              type="submit"
              disabled={(!input.trim() && !selectedImage) || isLoading}
              className="p-3 rounded-full bg-white text-black hover:bg-zinc-200 disabled:opacity-50 disabled:bg-white/10 disabled:text-zinc-500 transition-colors shrink-0 mb-0.5 mr-0.5"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
        <div className="text-center mt-3">
          <p className="text-xs text-zinc-500">
            O assistente pode cometer erros. Considere verificar informações importantes no{' '}
            <a href="https://ptb.discord.com/channels/1408201417834893385/1464812261611933839" target="_blank" rel="noopener noreferrer" className="underline hover:text-zinc-400">Discord</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
