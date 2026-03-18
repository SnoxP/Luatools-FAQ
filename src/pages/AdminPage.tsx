import React, { useState, useEffect } from 'react';
import { useFaq } from '../context/FaqContext';
import { Save, RotateCcw, AlertTriangle, CheckCircle2, Plus, Trash2, ChevronDown, ChevronRight, GripVertical, LogOut, Loader2 } from 'lucide-react';
import { FaqCategory, FaqItem } from '../data/defaultFaq';

export default function AdminPage() {
  const { faqData, updateFaqData, resetToDefault, user, isAdmin, isAuthReady, login, logout } = useFaq();
  
  // Local state for editing
  const [localData, setLocalData] = useState<FaqCategory[]>([]);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Sync local data when faqData changes (e.g., loaded from Firestore)
  useEffect(() => {
    setLocalData(JSON.parse(JSON.stringify(faqData)));
    setExpandedCategories(new Set(faqData.map(c => c.id)));
  }, [faqData]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login();
    } catch (err) {
      console.error("Login failed", err);
    }
  };

  const handleSave = async () => {
    try {
      setSaveStatus('saving');
      await updateFaqData(localData);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      console.error(err);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const handleReset = async () => {
    if (window.confirm('Tem certeza que deseja restaurar o FAQ para o padrão original? Todas as alterações não salvas serão perdidas.')) {
      try {
        await resetToDefault();
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 3000);
      } catch (err) {
        console.error(err);
        alert("Erro ao restaurar padrão");
      }
    }
  };

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  // Category Operations
  const addCategory = () => {
    const newId = `cat_${Date.now()}`;
    setLocalData([...localData, { id: newId, title: 'Nova Categoria', items: [] }]);
    setExpandedCategories(new Set(expandedCategories).add(newId));
  };

  const updateCategoryTitle = (categoryId: string, newTitle: string) => {
    setLocalData(localData.map(cat => cat.id === categoryId ? { ...cat, title: newTitle } : cat));
  };

  const deleteCategory = (categoryId: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta categoria e todas as suas perguntas?')) {
      setLocalData(localData.filter(cat => cat.id !== categoryId));
    }
  };

  // Item Operations
  const addItem = (categoryId: string) => {
    const newItemId = `item_${Date.now()}`;
    setLocalData(localData.map(cat => {
      if (cat.id === categoryId) {
        return {
          ...cat,
          items: [...cat.items, { id: newItemId, question: 'Nova Pergunta', answer: 'Resposta aqui...' }]
        };
      }
      return cat;
    }));
  };

  const updateItem = (categoryId: string, itemId: string, field: 'question' | 'answer', value: string) => {
    setLocalData(localData.map(cat => {
      if (cat.id === categoryId) {
        return {
          ...cat,
          items: cat.items.map(item => item.id === itemId ? { ...item, [field]: value } : item)
        };
      }
      return cat;
    }));
  };

  const deleteItem = (categoryId: string, itemId: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta pergunta?')) {
      setLocalData(localData.map(cat => {
        if (cat.id === categoryId) {
          return { ...cat, items: cat.items.filter(item => item.id !== itemId) };
        }
        return cat;
      }));
    }
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl text-center">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Acesso Restrito</h2>
            <p className="text-zinc-400 text-sm">Área exclusiva para administradores do LuaTools.</p>
          </div>
          
          <button
            onClick={handleLogin}
            className="w-full bg-white text-zinc-950 font-bold rounded-xl px-4 py-3 hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Entrar com Google
          </button>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Acesso Negado</h2>
          <p className="text-zinc-400 text-sm mb-6">
            Sua conta ({user.email}) não tem permissão de administrador.
          </p>
          <button
            onClick={logout}
            className="w-full bg-zinc-800 text-white font-medium rounded-xl px-4 py-3 hover:bg-zinc-700 transition-colors"
          >
            Sair e tentar outra conta
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Editor Visual de FAQ</h1>
            <p className="text-zinc-400">Edite as perguntas e respostas de forma fácil. As alterações refletem imediatamente no site e no Chatbot.</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 text-zinc-400 hover:text-white transition-colors border border-zinc-800"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors border border-zinc-700"
            >
              <RotateCcw className="w-4 h-4" />
              Restaurar Padrão
            </button>
            <button
              onClick={handleSave}
              disabled={saveStatus === 'saving'}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors ${
                saveStatus === 'success' ? 'bg-emerald-600 text-white' :
                saveStatus === 'error' ? 'bg-red-600 text-white' :
                'bg-indigo-600 text-white hover:bg-indigo-500'
              }`}
            >
              {saveStatus === 'success' ? <CheckCircle2 className="w-4 h-4" /> :
               saveStatus === 'error' ? <AlertTriangle className="w-4 h-4" /> :
               <Save className="w-4 h-4" />}
              {saveStatus === 'saving' ? 'Salvando...' :
               saveStatus === 'success' ? 'Salvo!' :
               saveStatus === 'error' ? 'Erro ao Salvar' :
               'Salvar Alterações'}
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {localData.map((category) => (
            <div key={category.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-lg">
              {/* Category Header */}
              <div className="bg-zinc-800/50 px-4 py-4 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <button onClick={() => toggleCategory(category.id)} className="text-zinc-400 hover:text-white transition-colors">
                    {expandedCategories.has(category.id) ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  </button>
                  <input
                    type="text"
                    value={category.title}
                    onChange={(e) => updateCategoryTitle(category.id, e.target.value)}
                    className="bg-transparent text-lg font-bold text-white focus:outline-none focus:border-b border-indigo-500 w-full max-w-md px-1"
                    placeholder="Nome da Categoria"
                  />
                </div>
                <button
                  onClick={() => deleteCategory(category.id)}
                  className="text-zinc-500 hover:text-red-400 transition-colors p-2 rounded-lg hover:bg-red-400/10"
                  title="Excluir Categoria"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              {/* Category Items */}
              {expandedCategories.has(category.id) && (
                <div className="p-4 space-y-4">
                  {category.items.map((item) => (
                    <div key={item.id} className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex gap-4">
                      <div className="mt-2 text-zinc-600 cursor-grab">
                        <GripVertical className="w-5 h-5" />
                      </div>
                      <div className="flex-1 space-y-3">
                        <input
                          type="text"
                          value={item.question}
                          onChange={(e) => updateItem(category.id, item.id, 'question', e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white font-medium focus:outline-none focus:border-indigo-500 transition-colors"
                          placeholder="Pergunta..."
                        />
                        <textarea
                          value={item.answer}
                          onChange={(e) => updateItem(category.id, item.id, 'answer', e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-300 text-sm focus:outline-none focus:border-indigo-500 transition-colors min-h-[100px] resize-y"
                          placeholder="Resposta..."
                        />
                      </div>
                      <button
                        onClick={() => deleteItem(category.id, item.id)}
                        className="text-zinc-600 hover:text-red-400 transition-colors p-2 h-fit rounded-lg hover:bg-red-400/10"
                        title="Excluir Pergunta"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                  
                  <button
                    onClick={() => addItem(category.id)}
                    className="w-full py-3 border-2 border-dashed border-zinc-800 rounded-xl text-zinc-400 hover:text-white hover:border-indigo-500 hover:bg-indigo-500/5 transition-all flex items-center justify-center gap-2 font-medium"
                  >
                    <Plus className="w-5 h-5" />
                    Adicionar Nova Pergunta
                  </button>
                </div>
              )}
            </div>
          ))}

          <button
            onClick={addCategory}
            className="w-full py-4 border-2 border-dashed border-zinc-800 rounded-2xl text-zinc-400 hover:text-white hover:border-indigo-500 hover:bg-indigo-500/5 transition-all flex items-center justify-center gap-2 font-medium text-lg"
          >
            <Plus className="w-6 h-6" />
            Adicionar Nova Categoria
          </button>
        </div>
      </div>
    </div>
  );
}
