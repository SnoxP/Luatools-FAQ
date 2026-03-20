import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useFaq } from '../context/FaqContext';
import { Save, RotateCcw, AlertTriangle, CheckCircle2, Plus, Trash2, ChevronDown, ChevronRight, GripVertical, LogOut, Loader2, Users, MessageSquare, Wrench } from 'lucide-react';
import { FaqCategory, FaqItem } from '../data/defaultFaq';
import { db, collection, getDocs, doc, updateDoc, getDoc, onSnapshot } from '../firebase';

import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

export default function AdminPage() {
  const { faqData, updateFaqData, resetToDefault, user, isAdmin, isAuthReady, login, signup, logout } = useFaq();
  
  // Local state for editing
  const [localData, setLocalData] = useState<FaqCategory[]>([]);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoginMode, setIsLoginMode] = useState(true);
  
  const [activeTab, setActiveTab] = useState<'faq' | 'users' | 'fix'>('faq');
  const [usersList, setUsersList] = useState<{id: string, email: string, role: string, isOnline?: boolean, lastActive?: number}[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // Modal state
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // Fix state
  const [fixData, setFixData] = useState({ title: '', description: '', version: '', downloadUrl: '' });
  const [isLoadingFix, setIsLoadingFix] = useState(false);
  const [saveFixStatus, setSaveFixStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  // Sync local data when faqData changes (e.g., loaded from Firestore)
  useEffect(() => {
    setLocalData(JSON.parse(JSON.stringify(faqData)));
    setExpandedCategories(new Set(faqData.map(c => c.id)));
  }, [faqData]);

  useEffect(() => {
    let unsubscribeUsers: (() => void) | undefined;

    if (isAdmin) {
      if (activeTab === 'users') {
        setIsLoadingUsers(true);
        unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
          const users = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
          setUsersList(users);
          setIsLoadingUsers(false);
        }, (err) => {
          console.error("Error fetching users", err);
          setIsLoadingUsers(false);
        });
      } else if (activeTab === 'fix') {
        fetchFixData();
      }
    }

    return () => {
      if (unsubscribeUsers) unsubscribeUsers();
    };
  }, [isAdmin, activeTab]);

  const fetchFixData = async () => {
    setIsLoadingFix(true);
    try {
      const docSnap = await getDoc(doc(db, 'content', 'game_fix'));
      if (docSnap.exists()) {
        const data = docSnap.data();
        setFixData({
          title: data.title || '',
          description: data.description || '',
          version: data.version || '',
          downloadUrl: data.downloadUrl || ''
        });
      }
    } catch (err) {
      console.error("Error fetching fix data", err);
    } finally {
      setIsLoadingFix(false);
    }
  };

  const saveFixData = async () => {
    setSaveFixStatus('saving');
    try {
      const now = new Date().toLocaleDateString('pt-BR');
      await updateDoc(doc(db, 'content', 'game_fix'), {
        ...fixData,
        updatedAt: now
      });
      setSaveFixStatus('success');
      setTimeout(() => setSaveFixStatus('idle'), 3000);
    } catch (err) {
      console.error("Error saving fix data", err);
      // If document doesn't exist, we might need setDoc instead of updateDoc, 
      // but assuming it's created or we can handle it. Let's use setDoc just in case.
      try {
        const { setDoc } = await import('../firebase');
        const now = new Date().toLocaleDateString('pt-BR');
        await setDoc(doc(db, 'content', 'game_fix'), {
          ...fixData,
          updatedAt: now
        });
        setSaveFixStatus('success');
        setTimeout(() => setSaveFixStatus('idle'), 3000);
      } catch (e) {
        setSaveFixStatus('error');
        setTimeout(() => setSaveFixStatus('idle'), 3000);
      }
    }
  };

  const toggleUserRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      setUsersList(usersList.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (err) {
      console.error("Error updating role", err);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      if (isLoginMode) {
        await login(email, password);
      } else {
        await signup(email, password);
      }
    } catch (err: any) {
      console.error("Auth failed", err);
      if (err.message === 'auth/operation-not-allowed') {
        setLoginError('O login com E-mail e Senha não está ativado no Firebase. Por favor, ative-o no console do Firebase.');
      } else if (err.code === 'auth/email-already-in-use') {
        setLoginError('Este e-mail já está em uso.');
      } else if (err.code === 'auth/weak-password') {
        setLoginError('A senha deve ter pelo menos 6 caracteres.');
      } else {
        setLoginError(isLoginMode ? 'Credenciais inválidas.' : 'Erro ao criar conta.');
      }
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
    setConfirmModal({
      isOpen: true,
      title: 'Restaurar Padrão',
      message: 'Tem certeza que deseja restaurar o FAQ para o padrão original? Todas as alterações não salvas serão perdidas.',
      onConfirm: async () => {
        try {
          await resetToDefault();
          setSaveStatus('success');
          setTimeout(() => setSaveStatus('idle'), 3000);
        } catch (err) {
          console.error(err);
          setSaveStatus('error');
          setTimeout(() => setSaveStatus('idle'), 3000);
        }
      }
    });
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
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Categoria',
      message: 'Tem certeza que deseja excluir esta categoria e todas as suas perguntas?',
      onConfirm: () => {
        setLocalData(localData.filter(cat => cat.id !== categoryId));
      }
    });
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
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Pergunta',
      message: 'Tem certeza que deseja excluir esta pergunta?',
      onConfirm: () => {
        setLocalData(localData.map(cat => {
          if (cat.id === categoryId) {
            return { ...cat, items: cat.items.filter(item => item.id !== itemId) };
          }
          return cat;
        }));
      }
    });
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const sourceCategoryId = result.source.droppableId;
    const destinationCategoryId = result.destination.droppableId;

    if (sourceCategoryId !== destinationCategoryId) {
      // Moving between categories (optional, can be disabled if not needed)
      const sourceCategoryIndex = localData.findIndex(cat => cat.id === sourceCategoryId);
      const destCategoryIndex = localData.findIndex(cat => cat.id === destinationCategoryId);
      
      if (sourceCategoryIndex === -1 || destCategoryIndex === -1) return;

      const newLocalData = [...localData];
      const sourceItems = [...newLocalData[sourceCategoryIndex].items];
      const destItems = [...newLocalData[destCategoryIndex].items];

      const [movedItem] = sourceItems.splice(result.source.index, 1);
      destItems.splice(result.destination.index, 0, movedItem);

      newLocalData[sourceCategoryIndex] = { ...newLocalData[sourceCategoryIndex], items: sourceItems };
      newLocalData[destCategoryIndex] = { ...newLocalData[destCategoryIndex], items: destItems };

      setLocalData(newLocalData);
    } else {
      // Reordering within the same category
      const categoryIndex = localData.findIndex(cat => cat.id === sourceCategoryId);
      if (categoryIndex === -1) return;

      const newLocalData = [...localData];
      const items = [...newLocalData[categoryIndex].items];
      
      const [reorderedItem] = items.splice(result.source.index, 1);
      items.splice(result.destination.index, 0, reorderedItem);

      newLocalData[categoryIndex] = { ...newLocalData[categoryIndex], items };
      setLocalData(newLocalData);
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
            <h2 className="text-2xl font-bold text-white mb-2">{isLoginMode ? 'Acesso Restrito' : 'Criar Conta'}</h2>
            <p className="text-zinc-400 text-sm">Área exclusiva para administradores do LuaTools.</p>
            <p className="text-indigo-400 text-sm mt-2 font-medium">Caso seja cargo Helper ou +, contate o SnoxP718 para adicioná-lo ao site.</p>
          </div>
          
          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <input
                type="email"
                placeholder="E-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                required
              />
            </div>
            <div>
              <input
                type="password"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                required
                minLength={6}
              />
            </div>
            {loginError && <p className="text-red-500 text-sm text-left">{loginError}</p>}
            <button
              type="submit"
              className="w-full bg-indigo-600 text-white font-bold rounded-xl px-4 py-3 hover:bg-indigo-500 transition-colors flex items-center justify-center gap-2"
            >
              {isLoginMode ? 'Entrar' : 'Criar Conta'}
            </button>
          </form>
          
          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsLoginMode(!isLoginMode);
                setLoginError('');
              }}
              className="text-zinc-400 hover:text-white text-sm transition-colors"
            >
              {isLoginMode ? 'Não tem uma conta? Criar agora' : 'Já tem uma conta? Entrar'}
            </button>
          </div>
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
            <h1 className="text-3xl font-bold text-white mb-2">Painel de Administração</h1>
            <p className="text-zinc-400">Gerencie o conteúdo e os usuários do sistema.</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 text-zinc-400 hover:text-white transition-colors border border-zinc-800"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
            {activeTab === 'faq' && (
              <>
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
              </>
            )}
          </div>
        </div>

        <div className="flex border-b border-zinc-800 mb-8">
          <button
            onClick={() => setActiveTab('faq')}
            className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'faq' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}
          >
            <MessageSquare className="w-4 h-4" />
            Gerenciar FAQ
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'users' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}
          >
            <Users className="w-4 h-4" />
            Usuários
          </button>
          <button
            onClick={() => setActiveTab('fix')}
            className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'fix' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}
          >
            <Wrench className="w-4 h-4" />
            Gerenciar Fix
          </button>
        </div>

        {activeTab === 'faq' ? (
          <DragDropContext onDragEnd={handleDragEnd}>
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
                  <Droppable droppableId={category.id}>
                    {(provided) => (
                      <div 
                        className="p-4 space-y-4"
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                      >
                        {category.items.map((item, index) => (
                          <Draggable key={item.id} draggableId={item.id} index={index}>
                            {(provided) => (
                              <div 
                                className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex gap-4"
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                              >
                                <div 
                                  className="mt-2 text-zinc-600 cursor-grab"
                                  {...provided.dragHandleProps}
                                >
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
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        
                        <button
                          onClick={() => addItem(category.id)}
                          className="w-full py-3 border-2 border-dashed border-zinc-800 rounded-xl text-zinc-400 hover:text-white hover:border-indigo-500 hover:bg-indigo-500/5 transition-all flex items-center justify-center gap-2 font-medium"
                        >
                          <Plus className="w-5 h-5" />
                          Adicionar Nova Pergunta
                        </button>
                      </div>
                    )}
                  </Droppable>
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
        </DragDropContext>
        ) : activeTab === 'users' ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="p-6">
              <h2 className="text-xl font-bold text-white mb-4">Gerenciar Usuários</h2>
              {isLoadingUsers ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-800 text-zinc-400 text-sm">
                        <th className="py-3 px-4 font-medium">E-mail</th>
                        <th className="py-3 px-4 font-medium">Cargo</th>
                        <th className="py-3 px-4 font-medium">Status</th>
                        <th className="py-3 px-4 font-medium text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usersList.map(u => {
                        const isOnline = u.isOnline && u.lastActive && (Date.now() - u.lastActive < 120000);
                        return (
                        <tr key={u.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors">
                          <td className="py-3 px-4 text-zinc-300">{u.email}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${u.role === 'admin' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-zinc-800 text-zinc-400 border border-zinc-700'}`}>
                              {u.role === 'admin' ? 'Admin' : 'Membro'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-zinc-600'}`}></span>
                              <span className="text-sm text-zinc-400">{isOnline ? 'Online' : 'Offline'}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => toggleUserRole(u.id, u.role)}
                              disabled={u.email === 'pedronobreneto27@gmail.com'}
                              className="text-sm px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {u.role === 'admin' ? 'Remover Admin' : 'Tornar Admin'}
                            </button>
                          </td>
                        </tr>
                      )})}
                      {usersList.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-zinc-500">
                            Nenhum usuário encontrado.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Gerenciar Fix</h2>
                <button
                  onClick={saveFixData}
                  disabled={saveFixStatus === 'saving'}
                  className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors ${
                    saveFixStatus === 'success' ? 'bg-emerald-600 text-white' :
                    saveFixStatus === 'error' ? 'bg-red-600 text-white' :
                    'bg-indigo-600 text-white hover:bg-indigo-500'
                  }`}
                >
                  {saveFixStatus === 'success' ? <CheckCircle2 className="w-4 h-4" /> :
                   saveFixStatus === 'error' ? <AlertTriangle className="w-4 h-4" /> :
                   <Save className="w-4 h-4" />}
                  {saveFixStatus === 'saving' ? 'Salvando...' :
                   saveFixStatus === 'success' ? 'Salvo!' :
                   saveFixStatus === 'error' ? 'Erro ao Salvar' :
                   'Salvar Fix'}
                </button>
              </div>
              
              {isLoadingFix ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Título da Correção</label>
                    <input
                      type="text"
                      value={fixData.title}
                      onChange={(e) => setFixData({ ...fixData, title: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                      placeholder="Ex: Correção de Bugs v1.2.0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Versão</label>
                    <input
                      type="text"
                      value={fixData.version}
                      onChange={(e) => setFixData({ ...fixData, version: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                      placeholder="Ex: 1.2.0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Link de Download</label>
                    <input
                      type="url"
                      value={fixData.downloadUrl}
                      onChange={(e) => setFixData({ ...fixData, downloadUrl: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                      placeholder="Ex: https://link-para-o-arquivo.com/fix.zip"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Descrição / Detalhes da Atualização</label>
                    <textarea
                      value={fixData.description}
                      onChange={(e) => setFixData({ ...fixData, description: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors min-h-[150px] resize-y"
                      placeholder="Descreva o que foi corrigido nesta versão..."
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-md w-full shadow-2xl"
          >
            <h3 className="text-xl font-semibold text-white mb-2">{confirmModal.title}</h3>
            <p className="text-zinc-400 mb-6">{confirmModal.message}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal({ ...confirmModal, isOpen: false });
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
              >
                Confirmar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
