import React, { useState } from 'react';
import { useFaq } from '../context/FaqContext';
import { Save, RotateCcw, AlertTriangle, CheckCircle2, Plus, Trash2, ChevronDown, ChevronRight, GripVertical } from 'lucide-react';
import { FaqCategory, FaqItem } from '../data/defaultFaq';

export default function AdminPage() {
  const { faqData, updateFaqData, resetToDefault } = useFaq();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  // Local state for editing
  const [localData, setLocalData] = useState<FaqCategory[]>(JSON.parse(JSON.stringify(faqData)));
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(localData.map(c => c.id)));

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin123') {
      setIsAuthenticated(true);
      setError('');
      setLocalData(JSON.parse(JSON.stringify(faqData)));
    } else {
      setError('Senha incorreta.');
    }
  };

  const handleSave = () => {
    try {
      setSaveStatus('saving');
      updateFaqData(localData);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      console.error(err);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const handleReset = () => {
    if (window.confirm('Tem certeza que deseja restaurar o FAQ para o padrão original? Todas as alterações não salvas serão perdidas.')) {
      resetToDefault();
      // Need to wait for context to update, or just use defaultFaq directly
      // For simplicity, we'll just reload the page to get the fresh context
      window.location.reload();
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

  if (!isAuthenticated) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Acesso Restrito</h2>
            <p className="text-zinc-400 text-sm">Área exclusiva para administradores do LuaTools.</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-zinc-300 mb-2">
                Senha de Administrador
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="Digite a senha..."
              />
              {error && <p className="mt-2 text-sm text-red-400 flex items-center gap-1"><AlertTriangle className="w-4 h-4" />{error}</p>}
            </div>
            <button
              type="submit"
              className="w-full bg-indigo-600 text-white font-medium rounded-xl px-4 py-3 hover:bg-indigo-500 transition-colors"
            >
              Entrar
            </button>
          </form>
          <div className="mt-6 text-center text-xs text-zinc-600">
            Dica: A senha padrão é admin123
          </div>
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
          <div className="flex items-center gap-3">
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
