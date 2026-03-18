import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { useFaq } from '../context/FaqContext';

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
        <span key={i} className="bg-indigo-500/30 text-indigo-300 rounded px-1">{part}</span> : part
    );
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">Central de Ajuda</h1>
          <p className="text-zinc-400 text-lg">Encontre soluções rápidas para os problemas mais comuns.</p>
        </div>

        {/* Search Bar */}
        <div className="relative mb-12">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-zinc-500" />
          </div>
          <input
            type="text"
            className="block w-full pl-12 pr-4 py-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm"
            placeholder="Pesquise por erros, guias ou palavras-chave..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {filteredData.length === 0 ? (
          <div className="text-center py-12 bg-zinc-900/50 rounded-2xl border border-zinc-800">
            <AlertCircle className="w-12 h-12 text-zinc-500 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-white mb-2">Nenhum resultado encontrado</h3>
            <p className="text-zinc-400">Tente usar outras palavras-chave ou abra um ticket no Discord.</p>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row gap-8">
            {/* Categories Sidebar (only show if not searching) */}
            {!searchTerm && (
              <div className="w-full md:w-64 shrink-0">
                <div className="sticky top-24 space-y-2">
                  <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4 px-3">Categorias</h3>
                  {faqData.map(category => (
                    <button
                      key={category.id}
                      onClick={() => setActiveCategory(category.id)}
                      className={`w-full text-left px-4 py-3 rounded-xl transition-all ${
                        activeCategory === category.id 
                          ? 'bg-indigo-600 text-white font-medium shadow-md shadow-indigo-500/20' 
                          : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
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
                      <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-sm text-indigo-400">
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
                              isExpanded ? 'bg-zinc-900 border-indigo-500/30' : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
                            }`}
                          >
                            <button
                              onClick={() => toggleItem(item.id)}
                              className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none"
                            >
                              <div className="flex items-center gap-4 pr-4">
                                <span className="text-xs font-mono text-zinc-500 bg-zinc-950 px-2 py-1 rounded shrink-0">
                                  {item.id}
                                </span>
                                <span className="font-medium text-white text-lg">
                                  {searchTerm ? highlightText(item.question, searchTerm) : item.question}
                                </span>
                              </div>
                              {isExpanded ? (
                                <ChevronUp className="w-5 h-5 text-indigo-400 shrink-0" />
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
                                  <div className="px-6 pb-6 pt-2 text-zinc-300 prose prose-invert max-w-none prose-p:leading-relaxed prose-a:text-indigo-400 hover:prose-a:text-indigo-300">
                                    <div className="whitespace-pre-wrap font-sans text-sm md:text-base">
                                      {item.answer}
                                    </div>
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
