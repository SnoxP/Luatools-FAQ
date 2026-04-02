import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useFaq } from '../context/FaqContext';
import { Save, RotateCcw, AlertTriangle, CheckCircle2, Plus, Trash2, ChevronDown, ChevronRight, GripVertical, LogOut, Loader2, Users, MessageSquare, Wrench, Bot, User as UserIcon } from 'lucide-react';
import { FaqCategory, FaqItem } from '../data/defaultFaq';
import { db, collection, getDocs, doc, updateDoc, getDoc, onSnapshot } from '../firebase';

import { useLocation, useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

export default function AdminPage() {
  const { faqData, updateFaqData, resetToDefault, user, isAdmin, isAuthReady, login, signup, logout } = useFaq();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Local state for editing
  const [localData, setLocalData] = useState<FaqCategory[]>([]);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoginMode, setIsLoginMode] = useState(true);
  
  const [activeTab, setActiveTab] = useState<'faq' | 'users' | 'fix' | 'bot'>('faq');
  const [usersList, setUsersList] = useState<{id: string, email: string, role: string, isOnline?: boolean, lastActive?: number}[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // Modal state
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // Fix state
  const [fixData, setFixData] = useState({ title: '', description: '', version: '', downloadUrl: '' });
  const [isLoadingFix, setIsLoadingFix] = useState(false);
  const [saveFixStatus, setSaveFixStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // Bot Settings state
  const [botSettings, setBotSettings] = useState({ dailyLimit: 100, userDailyLimit: 10, rpmLimit: 15, dailyGenerations: 0, lastResetDate: '' });
  const [isLoadingBot, setIsLoadingBot] = useState(false);
  const [saveBotStatus, setSaveBotStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  // Sync local data when faqData changes (e.g., loaded from Firestore)
  useEffect(() => {
    setLocalData(JSON.parse(JSON.stringify(faqData)));
    // FAQs are minimized by default (empty Set)
  }, [faqData]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab === 'fix' || tab === 'faq' || tab === 'users' || tab === 'bot') {
      setActiveTab(tab);
    }
  }, [location.search]);

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
      } else if (activeTab === 'bot') {
        fetchBotSettings();
      }
    }

    return () => {
      if (unsubscribeUsers) unsubscribeUsers();
    };
  }, [isAdmin, activeTab]);

  const fetchBotSettings = async () => {
    setIsLoadingBot(true);
    try {
      const docSnap = await getDoc(doc(db, 'content', 'bot_settings'));
      if (docSnap.exists()) {
        const data = docSnap.data();
        setBotSettings({
          dailyLimit: data.dailyLimit || 100,
          userDailyLimit: data.userDailyLimit || 10,
          rpmLimit: data.rpmLimit || 15,
          dailyGenerations: data.dailyGenerations || 0,
          lastResetDate: data.lastResetDate || ''
        });
      }
    } catch (err) {
      console.error("Error fetching bot settings", err);
    } finally {
      setIsLoadingBot(false);
    }
  };

  const saveBotSettings = async () => {
    setSaveBotStatus('saving');
    try {
      await updateDoc(doc(db, 'content', 'bot_settings'), {
        dailyLimit: botSettings.dailyLimit,
        userDailyLimit: botSettings.userDailyLimit,
        rpmLimit: botSettings.rpmLimit
      });
      setSaveBotStatus('success');
      setTimeout(() => setSaveBotStatus('idle'), 3000);
    } catch (err) {
      console.error("Error saving bot settings", err);
      try {
        const { setDoc } = await import('../firebase');
        await setDoc(doc(db, 'content', 'bot_settings'), {
          dailyLimit: botSettings.dailyLimit,
          userDailyLimit: botSettings.userDailyLimit,
          rpmLimit: botSettings.rpmLimit,
          dailyGenerations: botSettings.dailyGenerations,
          lastResetDate: botSettings.lastResetDate
        });
        setSaveBotStatus('success');
        setTimeout(() => setSaveBotStatus('idle'), 3000);
      } catch (e) {
        setSaveBotStatus('error');
        setTimeout(() => setSaveBotStatus('idle'), 3000);
      }
    }
  };

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

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    // Set title based on file name (without extension)
    const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
    setFixData(prev => ({ ...prev, title: fileNameWithoutExt }));

    try {
      const { storage, ref, uploadBytesResumable, getDownloadURL } = await import('../firebase');
      const storageRef = ref(storage, `fixes/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        (error) => {
          console.error("Upload failed", error);
          setUploadProgress(null);
          alert("Erro ao fazer upload do arquivo. Verifique se as regras do Firebase Storage permitem uploads (ex: allow write: if request.auth != null;).");
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          setFixData(prev => ({ ...prev, downloadUrl: downloadURL }));
          setUploadProgress(null);
        }
      );
    } catch (err) {
      console.error("Error initializing upload", err);
      setUploadProgress(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      handleFileUpload(e.clipboardData.files[0]);
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
      // Note: The redirect is handled by a useEffect watching the user/isAdmin state
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

  useEffect(() => {
    if (isAuthReady && user && !isAdmin) {
      navigate('/perfil');
    }
  }, [user, isAdmin, isAuthReady, navigate]);

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
      <div className="min-h-[80vh] flex items-center justify-center bg-[#212121]">
        <Loader2 className="w-8 h-8 text-zinc-500 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-full flex items-center justify-center px-4 bg-[#212121]">
        <div className="max-w-md w-full bg-[#2f2f2f] border border-white/10 rounded-2xl p-8 shadow-sm text-center">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-2">{isLoginMode ? 'Acesso Restrito' : 'Criar Conta'}</h2>
            <p className="text-zinc-400 text-sm">Área exclusiva para administradores do LuaTools.</p>
            <p className="text-zinc-300 text-sm mt-2">Caso seja cargo Helper ou +, contate o SnoxP718 para adicioná-lo ao site.</p>
          </div>
          
          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <input
                type="email"
                placeholder="E-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#212121] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/20 transition-colors"
                required
              />
            </div>
            <div>
              <input
                type="password"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#212121] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/20 transition-colors"
                required
                minLength={6}
              />
            </div>
            {loginError && <p className="text-red-400 text-sm text-left">{loginError}</p>}
            <button
              type="submit"
              className="w-full bg-white text-black font-medium rounded-xl px-4 py-3 hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2"
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
      <div className="min-h-full flex items-center justify-center px-4 bg-[#212121]">
        <div className="max-w-md w-full bg-[#2f2f2f] border border-white/10 rounded-2xl p-8 shadow-sm text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-white mb-2">Acesso Negado</h2>
          <p className="text-zinc-400 text-sm mb-6">
            Sua conta ({user.email}) não tem permissão de administrador.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => window.location.href = '/perfil'}
              className="w-full bg-white text-black font-medium rounded-xl px-4 py-3 hover:bg-zinc-200 transition-colors"
            >
              Ir para o Meu Perfil
            </button>
            <button
              onClick={logout}
              className="w-full bg-[#212121] text-white font-medium rounded-xl px-4 py-3 hover:bg-white/5 border border-white/10 transition-colors"
            >
              Sair e tentar outra conta
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#212121] text-zinc-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-white mb-2">Painel de Administração</h1>
            <p className="text-zinc-400 text-sm">Gerencie o conteúdo e os usuários do sistema.</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => navigate('/perfil')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2f2f2f] text-zinc-300 hover:text-white hover:bg-white/5 transition-colors border border-white/10"
              title="Meu Perfil"
            >
              <UserIcon className="w-4 h-4" />
            </button>
            <button
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2f2f2f] text-zinc-300 hover:text-white hover:bg-white/5 transition-colors border border-white/10"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
            {activeTab === 'faq' && (
              <>
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2f2f2f] text-zinc-300 hover:bg-white/5 hover:text-white transition-colors border border-white/10"
                >
                  <RotateCcw className="w-4 h-4" />
                  Restaurar Padrão
                </button>
                <button
                  onClick={handleSave}
                  disabled={saveStatus === 'saving'}
                  className={`flex items-center gap-2 px-6 py-2 rounded-xl font-medium transition-colors ${
                    saveStatus === 'success' ? 'bg-emerald-600 text-white' :
                    saveStatus === 'error' ? 'bg-red-600 text-white' :
                    'bg-white text-black hover:bg-zinc-200'
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

        <div className="flex border-b border-white/10 mb-8 overflow-x-auto">
          <button
            onClick={() => setActiveTab('faq')}
            className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'faq' ? 'border-white text-white' : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}
          >
            <MessageSquare className="w-4 h-4" />
            Gerenciar FAQ
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'users' ? 'border-white text-white' : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}
          >
            <Users className="w-4 h-4" />
            Usuários
          </button>
          <button
            onClick={() => setActiveTab('fix')}
            className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'fix' ? 'border-white text-white' : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}
          >
            <Wrench className="w-4 h-4" />
            Gerenciar Fix
          </button>
          <button
            onClick={() => setActiveTab('bot')}
            className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'bot' ? 'border-white text-white' : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}
          >
            <Bot className="w-4 h-4" />
            Configurações do Bot
          </button>
        </div>

        {activeTab === 'faq' ? (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="space-y-6">
              {localData.map((category) => (
              <div key={category.id} className="bg-[#2f2f2f] border border-white/10 rounded-2xl overflow-hidden shadow-sm">
                {/* Category Header */}
                <div className="bg-[#2f2f2f] px-4 py-4 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <button onClick={() => toggleCategory(category.id)} className="text-zinc-400 hover:text-white transition-colors">
                      {expandedCategories.has(category.id) ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    </button>
                    <input
                      type="text"
                      value={category.title}
                      onChange={(e) => updateCategoryTitle(category.id, e.target.value)}
                      className="bg-transparent text-lg font-semibold text-white focus:outline-none focus:border-b border-white/20 w-full max-w-md px-1"
                      placeholder="Nome da Categoria"
                    />
                  </div>
                  <button
                    onClick={() => deleteCategory(category.id)}
                    className="text-zinc-500 hover:text-red-400 transition-colors p-2 rounded-lg hover:bg-white/5"
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
                                className="bg-[#212121] border border-white/5 rounded-xl p-4 flex gap-4"
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
                                    className="w-full bg-[#2f2f2f] border border-white/10 rounded-lg px-3 py-2 text-white font-medium focus:outline-none focus:border-white/20 transition-colors"
                                    placeholder="Pergunta..."
                                  />
                                  <textarea
                                    value={item.answer}
                                    onChange={(e) => updateItem(category.id, item.id, 'answer', e.target.value)}
                                    className="w-full bg-[#2f2f2f] border border-white/10 rounded-lg px-4 py-3 text-zinc-300 text-sm focus:outline-none focus:border-white/20 transition-colors min-h-[250px] resize-y"
                                    placeholder="Resposta..."
                                  />
                                </div>
                                <button
                                  onClick={() => deleteItem(category.id, item.id)}
                                  className="text-zinc-600 hover:text-red-400 transition-colors p-2 h-fit rounded-lg hover:bg-white/5"
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
                          className="w-full py-3 border border-dashed border-white/20 rounded-xl text-zinc-400 hover:text-white hover:border-white/40 hover:bg-white/5 transition-all flex items-center justify-center gap-2 font-medium"
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
              className="w-full py-4 border border-dashed border-white/20 rounded-2xl text-zinc-400 hover:text-white hover:border-white/40 hover:bg-white/5 transition-all flex items-center justify-center gap-2 font-medium text-lg"
            >
              <Plus className="w-6 h-6" />
              Adicionar Nova Categoria
            </button>
          </div>
        </DragDropContext>
        ) : activeTab === 'users' ? (
          <div className="bg-[#2f2f2f] border border-white/10 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Gerenciar Usuários</h2>
              {isLoadingUsers ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-zinc-500" /></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-zinc-400 text-sm">
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
                        <tr key={u.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="py-3 px-4 text-zinc-300">{u.email}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${u.role === 'admin' ? 'bg-white/10 text-white border border-white/20' : 'bg-[#212121] text-zinc-400 border border-white/10'}`}>
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
                              disabled={u.email === 'pedronobreneto27@gmail.com' || u.email === 'pedronobreneto@gmail.com'}
                              className="text-sm px-3 py-1.5 rounded-lg bg-[#212121] hover:bg-white/10 text-zinc-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-white/10"
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
        ) : activeTab === 'fix' ? (
          <div 
            className={`bg-[#2f2f2f] border rounded-2xl overflow-hidden shadow-sm transition-colors ${isDragging ? 'border-white bg-white/5' : 'border-white/10'}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onPaste={handlePaste}
            tabIndex={0}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">Gerenciar Fix</h2>
                <button
                  onClick={saveFixData}
                  disabled={saveFixStatus === 'saving'}
                  className={`flex items-center gap-2 px-6 py-2 rounded-xl font-medium transition-colors ${
                    saveFixStatus === 'success' ? 'bg-emerald-600 text-white' :
                    saveFixStatus === 'error' ? 'bg-red-600 text-white' :
                    'bg-white text-black hover:bg-zinc-200'
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
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-zinc-500" /></div>
              ) : (
                <div className="space-y-6">
                  {uploadProgress !== null && (
                    <div className="bg-[#212121] border border-white/10 rounded-xl p-4">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-zinc-300">Enviando arquivo...</span>
                        <span className="text-white font-medium">{Math.round(uploadProgress)}%</span>
                      </div>
                      <div className="w-full bg-[#2f2f2f] rounded-full h-2">
                        <div className="bg-white h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                      </div>
                    </div>
                  )}
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
                    <p className="text-zinc-300 text-sm flex items-center gap-2 mb-3">
                      💡 Dica: Você pode arrastar um arquivo, usar Ctrl+V nesta área ou clicar no botão abaixo para fazer upload automático e preencher o nome.
                    </p>
                    <div className="flex items-center gap-4">
                      <label className="cursor-pointer bg-white text-black hover:bg-zinc-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                        Selecionar Arquivo
                        <input 
                          type="file" 
                          className="hidden" 
                          onChange={(e) => {
                            if (e.target.files && e.target.files.length > 0) {
                              handleFileUpload(e.target.files[0]);
                            }
                          }}
                        />
                      </label>
                      <span className="text-zinc-500 text-sm">Nenhum arquivo selecionado</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Título da Correção</label>
                    <input
                      type="text"
                      value={fixData.title}
                      onChange={(e) => setFixData({ ...fixData, title: e.target.value })}
                      className="w-full bg-[#212121] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/20 transition-colors"
                      placeholder="Ex: Correção de Bugs v1.2.0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Versão</label>
                    <input
                      type="text"
                      value={fixData.version}
                      onChange={(e) => setFixData({ ...fixData, version: e.target.value })}
                      className="w-full bg-[#212121] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/20 transition-colors"
                      placeholder="Ex: 1.2.0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Link de Download</label>
                    <input
                      type="url"
                      value={fixData.downloadUrl}
                      onChange={(e) => setFixData({ ...fixData, downloadUrl: e.target.value })}
                      className="w-full bg-[#212121] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/20 transition-colors"
                      placeholder="Ex: https://link-para-o-arquivo.com/fix.zip"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Descrição / Detalhes da Atualização</label>
                    <textarea
                      value={fixData.description}
                      onChange={(e) => setFixData({ ...fixData, description: e.target.value })}
                      className="w-full bg-[#212121] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/20 transition-colors min-h-[150px] resize-y"
                      placeholder="Descreva o que foi corrigido nesta versão..."
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'bot' ? (
          <div className="bg-[#2f2f2f] border border-white/10 rounded-2xl overflow-hidden shadow-sm">
            <div className="bg-[#2f2f2f] px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bot className="w-5 h-5 text-white" />
                <h2 className="text-lg font-semibold text-white">Configurações do Bot (IA)</h2>
              </div>
              <button
                onClick={saveBotSettings}
                disabled={saveBotStatus === 'saving'}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors ${
                  saveBotStatus === 'success' ? 'bg-emerald-600 text-white' :
                  saveBotStatus === 'error' ? 'bg-red-600 text-white' :
                  'bg-white text-black hover:bg-zinc-200'
                }`}
              >
                {saveBotStatus === 'success' ? <CheckCircle2 className="w-4 h-4" /> :
                 saveBotStatus === 'error' ? <AlertTriangle className="w-4 h-4" /> :
                 <Save className="w-4 h-4" />}
                {saveBotStatus === 'saving' ? 'Salvando...' :
                 saveBotStatus === 'success' ? 'Salvo!' :
                 saveBotStatus === 'error' ? 'Erro' :
                 'Salvar Configurações'}
              </button>
            </div>
            <div className="p-6">
              {isLoadingBot ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <div className="space-y-6 max-w-2xl">
                  <div className="bg-[#212121] border border-white/10 rounded-xl p-6 flex flex-col sm:flex-row gap-6 items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-white mb-1">Uso Diário</h3>
                      <p className="text-zinc-400 text-sm">Quantidade de mensagens respondidas pelo bot hoje.</p>
                      <p className="text-xs text-zinc-500 mt-1">Último reset: {botSettings.lastResetDate || 'Nunca'}</p>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-white">
                        {botSettings.dailyGenerations} <span className="text-zinc-500 text-xl">/ {botSettings.dailyLimit}</span>
                      </div>
                      <div className="w-full bg-[#2f2f2f] rounded-full h-2 mt-3 overflow-hidden">
                        <div 
                          className={`h-2 rounded-full ${botSettings.dailyGenerations >= botSettings.dailyLimit ? 'bg-red-500' : 'bg-white'}`}
                          style={{ width: `${Math.min(100, (botSettings.dailyGenerations / botSettings.dailyLimit) * 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Limite Diário de Mensagens (Global)</label>
                    <input
                      type="number"
                      min="1"
                      value={botSettings.dailyLimit}
                      onChange={(e) => setBotSettings({ ...botSettings, dailyLimit: parseInt(e.target.value) || 100 })}
                      className="w-full bg-[#212121] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/20 transition-colors"
                      placeholder="Ex: 1000"
                    />
                    <p className="text-xs text-zinc-500 mt-2">
                      Define o número máximo de perguntas que o bot pode responder por dia para todos os usuários somados.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Cota Diária por Usuário</label>
                    <input
                      type="number"
                      min="1"
                      value={botSettings.userDailyLimit}
                      onChange={(e) => setBotSettings({ ...botSettings, userDailyLimit: parseInt(e.target.value) || 10 })}
                      className="w-full bg-[#212121] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/20 transition-colors"
                      placeholder="Ex: 10"
                    />
                    <p className="text-xs text-zinc-500 mt-2">
                      Define quantas perguntas cada usuário individual pode fazer por dia (controlado via navegador).
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Requisições por Minuto (RPM)</label>
                    <input
                      type="number"
                      min="1"
                      value={botSettings.rpmLimit}
                      onChange={(e) => setBotSettings({ ...botSettings, rpmLimit: parseInt(e.target.value) || 15 })}
                      className="w-full bg-[#212121] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/20 transition-colors"
                      placeholder="Ex: 15"
                    />
                    <p className="text-xs text-zinc-500 mt-2">
                      Define quantas perguntas o usuário pode fazer por minuto (evita spam rápido).
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-[#2f2f2f] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-sm"
          >
            <h3 className="text-xl font-semibold text-white mb-2">{confirmModal.title}</h3>
            <p className="text-zinc-400 mb-6">{confirmModal.message}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white bg-[#212121] hover:bg-white/5 rounded-xl transition-colors border border-white/10"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal({ ...confirmModal, isOpen: false });
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors"
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
