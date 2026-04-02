import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { useFaq } from '../context/FaqContext';
import DiscordMarkdown from '../components/DiscordMarkdown';

export default function FaqPage() {
  const { faqData } = useFaq();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>(faqData[0]?.id || '');
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const toggleItem = (id: string) => {
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return faqData;

    const term = searchTerm.toLowerCase();
    return faqData.map(category => ({
      ...category,
      items: category.items.filter(item => 
        item.question.toLowerCase().includes(term) || 
        item.answer.toLowerCase().includes(term)
      )
    })).filter(category => category.items.length > 0);
  }, [faqData, searchTerm]);

  const highlightText = (text: string, highlight: string) => {
    if (!highlight.trim()) return text;
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === highlight.toLowerCase() ? 
        <span key={i} className="bg-white/20 text-white rounded px-1">{part}</span> : part
    );
  };

  return (
    <div className="min-h-full bg-[#212121] text-zinc-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-semibold text-white mb-3">Central de Ajuda</h1>
          <p className="text-zinc-400 text-base">Encontre soluções rápidas para os problemas mais comuns.</p>
        </div>

        {/* Search Bar */}
        <div className="relative mb-12 max-w-2xl mx-auto">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-zinc-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-12 pr-4 py-3.5 bg-[#2f2f2f] border border-white/10 rounded-2xl text-white placeholder-zinc-400 focus:outline-none focus:border-white/20 transition-colors shadow-sm text-[15px]"
            placeholder="Pesquise por erros, guias ou palavras-chave..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {filteredData.length === 0 ? (
          <div className="text-center py-12 bg-[#2f2f2f] rounded-2xl border border-white/10 max-w-2xl mx-auto">
            <AlertCircle className="w-10 h-10 text-zinc-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">Nenhum resultado encontrado</h3>
            <p className="text-zinc-400 text-sm">Tente usar outras palavras-chave ou abra um ticket no Discord.</p>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row gap-8">
            {/* Categories Sidebar (only show if not searching) */}
            {!searchTerm && (
              <div className="w-full md:w-64 shrink-0">
                <div className="sticky top-8 space-y-1">
                  <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 px-3">Categorias</h3>
                  {faqData.map(category => (
                    <button
                      key={category.id}
                      onClick={() => setActiveCategory(category.id)}
                      className={`w-full text-left px-4 py-2.5 rounded-xl transition-colors text-sm ${
                        activeCategory === category.id 
                          ? 'bg-[#2f2f2f] text-white font-medium border border-white/10' 
                          : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200 border border-transparent'
                      }`}
                    >
                      {category.title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* FAQ Content */}
            <div className="flex-1 space-y-8">
              {filteredData.map(category => {
                if (!searchTerm && category.id !== activeCategory) return null;

                return (
                  <div key={category.id} className="space-y-4">
                    {searchTerm && (
                      <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <span className="w-6 h-6 rounded bg-[#2f2f2f] flex items-center justify-center text-xs text-zinc-300 border border-white/10">
                          {category.id}
                        </span>
                        {category.title}
                      </h2>
                    )}
                    
                    <div className="space-y-3">
                      {category.items.map(item => {
                        const isExpanded = expandedItems[item.id];
                        return (
                          <motion.div 
                            key={item.id}
                            initial={false}
                            className={`border rounded-2xl overflow-hidden transition-colors ${
                              isExpanded ? 'bg-[#2f2f2f] border-white/20' : 'bg-[#2f2f2f]/50 border-white/10 hover:border-white/20'
                            }`}
                          >
                            <button
                              onClick={() => toggleItem(item.id)}
                              className="w-full px-5 py-4 flex items-center justify-between text-left focus:outline-none"
                            >
                              <div className="flex items-center gap-3 pr-4">
                                <span className="text-xs font-mono text-zinc-500 bg-[#212121] px-2 py-1 rounded shrink-0 border border-white/5">
                                  {item.id}
                                </span>
                                <span className="font-medium text-zinc-200 text-[15px] break-words">
                                  {searchTerm ? highlightText(item.question, searchTerm) : item.question}
                                </span>
                              </div>
                              {isExpanded ? (
                                <ChevronUp className="w-5 h-5 text-zinc-400 shrink-0" />
                              ) : (
                                <ChevronDown className="w-5 h-5 text-zinc-500 shrink-0" />
                              )}
                            </button>
                            
                            <AnimatePresence initial={false}>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <div className="px-5 pb-5 pt-1 text-zinc-300 border-t border-white/5 mt-2">
                                    <DiscordMarkdown className="text-[15px] leading-relaxed break-words pt-3">
                                      {item.answer}
                                    </DiscordMarkdown>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
