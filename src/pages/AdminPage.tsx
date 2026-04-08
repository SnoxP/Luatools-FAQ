import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useFaq } from '../context/FaqContext';
import { useSettings } from '../context/SettingsContext';
import { Save, RotateCcw, AlertTriangle, CheckCircle2, Plus, Trash2, ChevronDown, ChevronRight, GripVertical, LogOut, Loader2, Users, MessageSquare, Wrench, Bot, User as UserIcon, AlertCircle, Upload } from 'lucide-react';
import { FaqCategory, FaqItem } from '../data/defaultFaq';
import { db, collection, getDocs, doc, updateDoc, getDoc, onSnapshot, query, orderBy, limit, startAfter, deleteDoc } from '../firebase';
import { GoogleGenAI } from '@google/genai';

import { useLocation, useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

export default function AdminPage() {
  const { faqData, updateFaqData, resetToDefault, user, userData, isAdmin, isAuthReady, login, signup, logout } = useFaq();
  const { t, language } = useSettings();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Local state for editing
  const [localData, setLocalData] = useState<FaqCategory[]>([]);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoginMode, setIsLoginMode] = useState(true);
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'faq' | 'users' | 'fix' | 'bot' | 'logs'>('dashboard');
  const [usersList, setUsersList] = useState<{id: string, email: string, username?: string, role: string, isOnline?: boolean, lastActive?: number, isBanned?: boolean}[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [editingUser, setEditingUser] = useState<{id: string, username: string, role: string} | null>(null);

  // Analytics state
  const [analyticsData, setAnalyticsData] = useState<{today: {visits: number, logins: number}, yesterday: {visits: number, logins: number}}>({
    today: {visits: 0, logins: 0},
    yesterday: {visits: 0, logins: 0}
  });
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);

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
  const [botStatus, setBotStatus] = useState<'checking' | 'online' | 'error'>('checking');
  const [botErrorReason, setBotErrorReason] = useState<string>('');
  const [chatLogs, setChatLogs] = useState<any[]>([]);
  const [lastLogDoc, setLastLogDoc] = useState<any>(null);
  const [hasMoreLogs, setHasMoreLogs] = useState(true);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  
  // Admin Logs state
  const [adminLogs, setAdminLogs] = useState<any[]>([]);
  const [lastAdminLogDoc, setLastAdminLogDoc] = useState<any>(null);
  const [hasMoreAdminLogs, setHasMoreAdminLogs] = useState(true);
  const [isLoadingAdminLogs, setIsLoadingAdminLogs] = useState(false);
  const isSuperAdmin = user?.email === 'pedronobreneto27@gmail.com';

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
    let unsubscribeLogs: (() => void) | undefined;

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
        checkBotStatus();
        fetchChatLogs();
      } else if (activeTab === 'logs' && isSuperAdmin) {
        fetchAdminLogs();
      } else if (activeTab === 'dashboard') {
        fetchAnalytics();
      }
    }

    return () => {
      if (unsubscribeUsers) unsubscribeUsers();
    };
  }, [isAdmin, activeTab]);

  const fetchAnalytics = async () => {
    setIsLoadingAnalytics(true);
    try {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const todayStr = today.toISOString().split('T')[0];
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const todayDoc = await getDoc(doc(db, 'analytics', todayStr));
      const yesterdayDoc = await getDoc(doc(db, 'analytics', yesterdayStr));

      setAnalyticsData({
        today: {
          visits: todayDoc.exists() ? todayDoc.data().visits || 0 : 0,
          logins: todayDoc.exists() ? todayDoc.data().logins || 0 : 0
        },
        yesterday: {
          visits: yesterdayDoc.exists() ? yesterdayDoc.data().visits || 0 : 0,
          logins: yesterdayDoc.exists() ? yesterdayDoc.data().logins || 0 : 0
        }
      });
    } catch (err) {
      console.error("Error fetching analytics", err);
    } finally {
      setIsLoadingAnalytics(false);
    }
  };

  const fetchChatLogs = async (loadMore = false) => {
    if (isLoadingLogs) return;
    setIsLoadingLogs(true);
    try {
      let q = query(collection(db, 'chat_logs'), orderBy('timestamp', 'desc'), limit(20));
      if (loadMore && lastLogDoc) {
        q = query(collection(db, 'chat_logs'), orderBy('timestamp', 'desc'), startAfter(lastLogDoc), limit(20));
      }
      const snapshot = await getDocs(q);
      const logs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
      
      if (snapshot.docs.length > 0) {
        setLastLogDoc(snapshot.docs[snapshot.docs.length - 1]);
      }
      if (snapshot.docs.length < 20) {
        setHasMoreLogs(false);
      } else {
        setHasMoreLogs(true);
      }

      if (loadMore) {
        setChatLogs(prev => [...prev, ...logs]);
      } else {
        setChatLogs(logs);
      }
    } catch (err) {
      console.error("Error fetching chat logs", err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const fetchAdminLogs = async (loadMore = false) => {
    if (isLoadingAdminLogs) return;
    setIsLoadingAdminLogs(true);
    try {
      let q = query(collection(db, 'admin_logs'), orderBy('timestamp', 'desc'), limit(20));
      if (loadMore && lastAdminLogDoc) {
        q = query(collection(db, 'admin_logs'), orderBy('timestamp', 'desc'), startAfter(lastAdminLogDoc), limit(20));
      }
      const snapshot = await getDocs(q);
      const logs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
      
      if (snapshot.docs.length > 0) {
        setLastAdminLogDoc(snapshot.docs[snapshot.docs.length - 1]);
      }
      if (snapshot.docs.length < 20) {
        setHasMoreAdminLogs(false);
      } else {
        setHasMoreAdminLogs(true);
      }

      if (loadMore) {
        setAdminLogs(prev => [...prev, ...logs]);
      } else {
        setAdminLogs(logs);
      }
    } catch (err) {
      console.error("Error fetching admin logs", err);
    } finally {
      setIsLoadingAdminLogs(false);
    }
  };

  const logAdminAction = async (action: string, details: string) => {
    if (!user) return;
    try {
      const { setDoc } = await import('../firebase');
      const logId = `log_${Date.now()}`;
      await setDoc(doc(db, 'admin_logs', logId), {
        action,
        details,
        userEmail: user.email,
        timestamp: Date.now()
      });
    } catch (err) {
      console.error("Error logging admin action", err);
    }
  };

  const checkBotStatus = async () => {
    setBotStatus('checking');
    setBotErrorReason('');
    try {
      const apiKey = process.env.GEMINI_API_KEY || (import.meta as any).env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('Chave da API (VITE_GEMINI_API_KEY) não encontrada nas variáveis de ambiente.');
      }
      const ai = new GoogleGenAI({ apiKey });
      await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: 'ping',
        config: { maxOutputTokens: 1 }
      });
      setBotStatus('online');
    } catch (err: any) {
      setBotStatus('error');
      setBotErrorReason(err.message || String(err));
    }
  };

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

    if (file.size > 200 * 1024 * 1024) {
      alert("O arquivo é muito grande. O limite é de 200MB.");
      return;
    }

    // Set title based on file name (without extension)
    const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
    setFixData(prev => ({ ...prev, title: fileNameWithoutExt }));
    setUploadProgress(0);

    try {
      // Usando a API do Gofile.io para hospedar o arquivo gratuitamente (suporta CORS)
      
      // 1. Obter o melhor servidor disponível
      const serverResponse = await fetch('https://api.gofile.io/servers', {
        method: 'GET',
      });
      const serverData = await serverResponse.json();
      
      if (serverData.status !== 'ok' || !serverData.data?.servers?.length) {
        throw new Error('Não foi possível conectar aos servidores de upload.');
      }
      
      const server = serverData.data.servers[0].name;

      // 2. Fazer o upload para o servidor selecionado
      const formData = new FormData();
      formData.append('file', file);

      // Simular progresso
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev === null) return null;
          const next = prev + 5;
          return next > 90 ? 90 : next;
        });
      }, 500);

      const uploadResponse = await fetch(`https://${server}.gofile.io/contents/uploadfile`, {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      const uploadData = await uploadResponse.json();

      if (uploadData.status !== 'ok') {
        throw new Error('Falha no upload para o servidor.');
      }

      const downloadURL = uploadData.data.downloadPage;
      
      setFixData(prev => ({ ...prev, downloadUrl: downloadURL }));
      setUploadProgress(100);
      
      setTimeout(() => {
        setUploadProgress(null);
      }, 1000);
      
      // Auto-save the new URL
      try {
        const { setDoc } = await import('../firebase');
        const now = new Date().toLocaleDateString('pt-BR');
        await setDoc(doc(db, 'content', 'game_fix'), {
          title: fileNameWithoutExt,
          downloadUrl: downloadURL,
          updatedAt: now
        }, { merge: true });
        alert("Arquivo enviado e link salvo com sucesso!");
      } catch (e) {
        console.error("Error auto-saving fix data:", e);
      }
    } catch (err: any) {
      console.error("Error uploading file", err);
      setUploadProgress(null);
      alert(`Erro ao fazer upload do arquivo: ${err.message || 'Tente novamente mais tarde.'}`);
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
      const { setDoc } = await import('../firebase');
      const now = new Date().toLocaleDateString('pt-BR');
      await setDoc(doc(db, 'content', 'game_fix'), {
        ...fixData,
        updatedAt: now
      }, { merge: true });
      await logAdminAction('update_fix', 'Dados de correção atualizados');
      setSaveFixStatus('success');
      setTimeout(() => setSaveFixStatus('idle'), 3000);
    } catch (err) {
      console.error("Error saving fix data", err);
      setSaveFixStatus('error');
      setTimeout(() => setSaveFixStatus('idle'), 3000);
    }
  };

  const toggleUserRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      await logAdminAction('update_user_role', `Cargo atualizado para ${newRole} do usuário ${userId}`);
      setUsersList(usersList.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (err) {
      console.error("Error updating role", err);
    }
  };

  const toggleUserBan = async (userId: string, currentBanStatus: boolean) => {
    const newBanStatus = !currentBanStatus;
    try {
      await updateDoc(doc(db, 'users', userId), { isBanned: newBanStatus });
      await logAdminAction(newBanStatus ? 'ban_user' : 'unban_user', `Usuário ${newBanStatus ? 'banido' : 'desbanido'}: ${userId}`);
      setUsersList(usersList.map(u => u.id === userId ? { ...u, isBanned: newBanStatus } : u));
    } catch (err) {
      console.error("Error updating ban status", err);
    }
  };

  const kickUser = (userId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Expulsar Usuário',
      message: 'Tem certeza que deseja expulsar este usuário? A conta será removida.',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'users', userId));
          await logAdminAction('kick_user', `Usuário expulso: ${userId}`);
          setUsersList(prev => prev.filter(u => u.id !== userId));
        } catch (err) {
          console.error("Error kicking user", err);
        }
      }
    });
  };

  const saveUserEdit = async () => {
    if (!editingUser) return;
    const userToEdit = usersList.find(u => u.id === editingUser.id);
    if (userToEdit && (userToEdit.email === 'pedronobreneto27@gmail.com' || userToEdit.email === 'pedronobreneto@gmail.com')) {
      alert("Não é permitido editar o administrador principal.");
      return;
    }
    try {
      await updateDoc(doc(db, 'users', editingUser.id), { 
        username: editingUser.username,
        role: editingUser.role 
      });
      await logAdminAction('edit_user', `Usuário editado: ${editingUser.id}`);
      setUsersList(usersList.map(u => u.id === editingUser.id ? { ...u, username: editingUser.username, role: editingUser.role } : u));
      setEditingUser(null);
    } catch (err) {
      console.error("Error updating user", err);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      await login();
      // Note: The redirect is handled by a useEffect watching the user/isAdmin state
    } catch (err: any) {
      console.error("Auth failed", err);
      if (err.code === 'auth/operation-not-allowed') {
        setLoginError('O login com Discord não está ativado no Firebase. Por favor, ative-o no console do Firebase.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setLoginError('Este domínio não está autorizado no Firebase. Adicione a URL atual na lista de domínios autorizados no Console do Firebase (Authentication > Settings > Authorized domains).');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setLoginError('A janela de login foi fechada antes de concluir. Tente novamente.');
      } else if (err.code === 'auth/popup-blocked') {
        setLoginError('O pop-up de login foi bloqueado pelo navegador. Por favor, permita pop-ups para este site ou abra o site em uma nova guia.');
      } else {
        setLoginError(`Erro ao fazer login: ${err.message || err.code || 'Erro desconhecido'}. Se estiver usando o preview, tente abrir o site em uma nova guia.`);
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
      await logAdminAction('update_faq', 'FAQ atualizado manualmente');
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
          await logAdminAction('reset_faq', 'FAQ restaurado para o padrão');
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
      onConfirm: async () => {
        const newData = localData.filter(cat => cat.id !== categoryId);
        setLocalData(newData);
        try {
          setSaveStatus('saving');
          await updateFaqData(newData);
          await logAdminAction('delete_category', `Categoria excluída: ${categoryId}`);
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

  // Item Operations
  const addItem = (categoryId: string) => {
    const newItemId = `item_${Date.now()}`;
    setLocalData(localData.map(cat => {
      if (cat.id === categoryId) {
        return {
          ...cat,
          items: [...cat.items, { id: newItemId, question: 'Nova Pergunta', answer: 'Resposta aqui...', author: userData?.username || user?.email || 'Desconhecido' }]
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
      onConfirm: async () => {
        const newData = localData.map(cat => {
          if (cat.id === categoryId) {
            return { ...cat, items: cat.items.filter(item => item.id !== itemId) };
          }
          return cat;
        });
        setLocalData(newData);
        try {
          setSaveStatus('saving');
          await updateFaqData(newData);
          await logAdminAction('delete_faq_item', `Pergunta excluída da categoria: ${categoryId}`);
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
      <div className="min-h-[80vh] flex items-center justify-center bg-zinc-50 dark:bg-[#212121] transition-colors duration-200">
        <Loader2 className="w-8 h-8 text-zinc-400 dark:text-zinc-500 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-full flex items-center justify-center px-4 bg-zinc-50 dark:bg-[#212121] transition-colors duration-200">
        <div className="max-w-md w-full bg-white dark:bg-[#2f2f2f] border border-black/10 dark:border-white/10 rounded-2xl p-8 shadow-sm text-center transition-colors duration-200">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-zinc-900 dark:text-white mb-2">Acesso ao Painel</h2>
            <p className="text-zinc-600 dark:text-zinc-400 text-sm">Faça login com sua conta do Discord para continuar.</p>
          </div>
          
          <div className="space-y-4">
            {loginError && <p className="text-red-500 dark:text-red-400 text-sm text-left">{loginError}</p>}
            <button
              onClick={handleAuth}
              className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium rounded-xl px-4 py-3 transition-colors flex items-center justify-center gap-3"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 127.14 96.36" fill="currentColor">
                <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.31,60,73.31,53s5-12.74,11.43-12.74S96.36,46,96.26,53,91.21,65.69,84.69,65.69Z"/>
              </svg>
              Login com Discord
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-full flex items-center justify-center px-4 bg-zinc-50 dark:bg-[#212121] transition-colors duration-200">
        <div className="max-w-md w-full bg-white dark:bg-[#2f2f2f] border border-black/10 dark:border-white/10 rounded-2xl p-8 shadow-sm text-center transition-colors duration-200">
          <AlertTriangle className="w-12 h-12 text-red-500 dark:text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-zinc-900 dark:text-white mb-2">{t('admin.accessDenied')}</h2>
          <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-6">
            {t('admin.accessDeniedMsg').replace('{email}', user.email || '')}
          </p>
          <div className="space-y-3">
            <button
              onClick={() => window.location.href = '/perfil'}
              className="w-full bg-zinc-900 dark:bg-white text-white dark:text-black font-medium rounded-xl px-4 py-3 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
            >
              {t('admin.goToProfile')}
            </button>
            <button
              onClick={logout}
              className="w-full bg-zinc-50 dark:bg-[#212121] text-zinc-900 dark:text-white font-medium rounded-xl px-4 py-3 hover:bg-zinc-100 dark:hover:bg-white/5 border border-black/10 dark:border-white/10 transition-colors"
            >
              {t('admin.logoutTryOther')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-zinc-50 dark:bg-[#212121] text-zinc-900 dark:text-zinc-100 py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white mb-2">{t('admin.title')}</h1>
            <p className="text-zinc-600 dark:text-zinc-400 text-sm">{t('admin.subtitle')}</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => navigate('/perfil')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-[#2f2f2f] text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors border border-black/10 dark:border-white/10"
              title={t('nav.profile')}
            >
              <UserIcon className="w-4 h-4" />
            </button>
            <button
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-[#2f2f2f] text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors border border-black/10 dark:border-white/10"
              title={t('nav.logout')}
            >
              <LogOut className="w-4 h-4" />
            </button>
            {activeTab === 'faq' && (
              <>
                <button
                  onClick={handleSave}
                  disabled={saveStatus === 'saving'}
                  className={`flex items-center gap-2 px-6 py-2 rounded-xl font-medium transition-colors ${
                    saveStatus === 'success' ? 'bg-emerald-600 text-white' :
                    saveStatus === 'error' ? 'bg-red-600 text-white' :
                    'bg-zinc-900 dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200'
                  }`}
                >
                  {saveStatus === 'success' ? <CheckCircle2 className="w-4 h-4" /> :
                   saveStatus === 'error' ? <AlertTriangle className="w-4 h-4" /> :
                   <Save className="w-4 h-4" />}
                  {saveStatus === 'saving' ? t('admin.saving') :
                   saveStatus === 'success' ? t('admin.success') :
                   saveStatus === 'error' ? t('admin.error') :
                   t('admin.save')}
                </button>
              </>
            )}
          </div>
        </div>

        <div className="flex border-b border-black/10 dark:border-white/10 mb-8 overflow-x-auto hide-scrollbar">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'dashboard' ? 'border-zinc-900 dark:border-white text-zinc-900 dark:text-white' : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
            Visão Geral
          </button>
          <button
            onClick={() => setActiveTab('faq')}
            className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'faq' ? 'border-zinc-900 dark:border-white text-zinc-900 dark:text-white' : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}`}
          >
            <MessageSquare className="w-4 h-4" />
            {t('admin.tabFaq')}
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'users' ? 'border-zinc-900 dark:border-white text-zinc-900 dark:text-white' : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}`}
          >
            <Users className="w-4 h-4" />
            {t('admin.tabUsers')}
          </button>
          <button
            onClick={() => setActiveTab('fix')}
            className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'fix' ? 'border-zinc-900 dark:border-white text-zinc-900 dark:text-white' : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}`}
          >
            <Wrench className="w-4 h-4" />
            {t('admin.tabFix')}
          </button>
          <button
            onClick={() => setActiveTab('bot')}
            className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'bot' ? 'border-zinc-900 dark:border-white text-zinc-900 dark:text-white' : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}`}
          >
            <Bot className="w-4 h-4" />
            {t('admin.tabBot')}
          </button>
          {isSuperAdmin && (
            <button
              onClick={() => setActiveTab('logs')}
              className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'logs' ? 'border-zinc-900 dark:border-white text-zinc-900 dark:text-white' : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}`}
            >
              <AlertCircle className="w-4 h-4" />
              Logs de Atividade
            </button>
          )}
        </div>

        {activeTab === 'dashboard' ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Visits Card */}
              <div className="bg-white dark:bg-[#2f2f2f] border border-black/10 dark:border-white/10 rounded-2xl p-6 shadow-sm transition-colors duration-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-zinc-900 dark:text-white">Visitas Hoje</h3>
                  <div className="p-2 bg-blue-50 dark:bg-blue-500/10 rounded-lg">
                    <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                {isLoadingAnalytics ? (
                  <div className="flex justify-center py-4"><Loader2 className="w-6 h-6 animate-spin text-zinc-400" /></div>
                ) : (
                  <>
                    <div className="text-4xl font-bold text-zinc-900 dark:text-white mb-2">
                      {analyticsData.today.visits}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      {analyticsData.today.visits >= analyticsData.yesterday.visits ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
                          +{analyticsData.today.visits - analyticsData.yesterday.visits}
                        </span>
                      ) : (
                        <span className="text-red-600 dark:text-red-400 font-medium flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/></svg>
                          {analyticsData.today.visits - analyticsData.yesterday.visits}
                        </span>
                      )}
                      <span className="text-zinc-500 dark:text-zinc-400">em relação a ontem ({analyticsData.yesterday.visits})</span>
                    </div>
                  </>
                )}
              </div>

              {/* Logins Card */}
              <div className="bg-white dark:bg-[#2f2f2f] border border-black/10 dark:border-white/10 rounded-2xl p-6 shadow-sm transition-colors duration-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-zinc-900 dark:text-white">Logins Hoje</h3>
                  <div className="p-2 bg-purple-50 dark:bg-purple-500/10 rounded-lg">
                    <LogOut className="w-5 h-5 text-purple-600 dark:text-purple-400 rotate-180" />
                  </div>
                </div>
                {isLoadingAnalytics ? (
                  <div className="flex justify-center py-4"><Loader2 className="w-6 h-6 animate-spin text-zinc-400" /></div>
                ) : (
                  <>
                    <div className="text-4xl font-bold text-zinc-900 dark:text-white mb-2">
                      {analyticsData.today.logins}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      {analyticsData.today.logins >= analyticsData.yesterday.logins ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
                          +{analyticsData.today.logins - analyticsData.yesterday.logins}
                        </span>
                      ) : (
                        <span className="text-red-600 dark:text-red-400 font-medium flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/></svg>
                          {analyticsData.today.logins - analyticsData.yesterday.logins}
                        </span>
                      )}
                      <span className="text-zinc-500 dark:text-zinc-400">em relação a ontem ({analyticsData.yesterday.logins})</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : activeTab === 'faq' ? (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="space-y-6">
              {localData.map((category) => (
              <div key={category.id} className="bg-white dark:bg-[#2f2f2f] border border-black/10 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm transition-colors duration-200">
                {/* Category Header */}
                <div className="bg-zinc-50 dark:bg-[#2f2f2f] px-4 py-4 border-b border-black/10 dark:border-white/10 flex items-center justify-between transition-colors duration-200">
                  <div className="flex items-center gap-3 flex-1">
                    <button onClick={() => toggleCategory(category.id)} className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
                      {expandedCategories.has(category.id) ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    </button>
                    <input
                      type="text"
                      value={category.title}
                      onChange={(e) => updateCategoryTitle(category.id, e.target.value)}
                      className="bg-transparent text-lg font-semibold text-zinc-900 dark:text-white focus:outline-none focus:border-b border-black/20 dark:border-white/20 w-full max-w-md px-1 transition-colors"
                      placeholder={t('admin.categoryTitle')}
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => deleteCategory(category.id)}
                      className="text-zinc-400 dark:text-zinc-500 hover:text-red-500 dark:hover:text-red-400 transition-colors p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/5"
                      title={t('admin.deleteCategory')}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
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
                                className="bg-zinc-50 dark:bg-[#212121] border border-black/5 dark:border-white/5 rounded-xl p-4 flex gap-4 transition-colors duration-200"
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                              >
                                <div 
                                  className="mt-2 text-zinc-400 dark:text-zinc-600 cursor-grab"
                                  {...provided.dragHandleProps}
                                >
                                  <GripVertical className="w-5 h-5" />
                                </div>
                                <div className="flex-1 space-y-3">
                                  <input
                                    type="text"
                                    value={item.question}
                                    onChange={(e) => updateItem(category.id, item.id, 'question', e.target.value)}
                                    className="w-full bg-white dark:bg-[#2f2f2f] border border-black/10 dark:border-white/10 rounded-lg px-3 py-2 text-zinc-900 dark:text-white font-medium focus:outline-none focus:border-black/20 dark:focus:border-white/20 transition-colors"
                                    placeholder={t('admin.question')}
                                  />
                                  <textarea
                                    value={item.answer}
                                    onChange={(e) => updateItem(category.id, item.id, 'answer', e.target.value)}
                                    className="w-full bg-white dark:bg-[#2f2f2f] border border-black/10 dark:border-white/10 rounded-lg px-4 py-3 text-zinc-700 dark:text-zinc-300 text-sm focus:outline-none focus:border-black/20 dark:focus:border-white/20 transition-colors min-h-[250px] resize-y"
                                    placeholder={t('admin.answer')}
                                  />
                                  {item.author && (
                                    <div className="text-xs text-zinc-500 flex items-center gap-1">
                                      <span className="font-medium">Adicionado por:</span> {item.author}
                                    </div>
                                  )}
                                </div>
                                <button
                                  onClick={() => deleteItem(category.id, item.id)}
                                  className="text-zinc-400 dark:text-zinc-600 hover:text-red-500 dark:hover:text-red-400 transition-colors p-2 h-fit rounded-lg hover:bg-zinc-100 dark:hover:bg-white/5"
                                  title={t('admin.deleteQuestion')}
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
                          {t('admin.addQuestion')}
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
              {t('admin.addCategory')}
            </button>
          </div>
        </DragDropContext>
        ) : activeTab === 'users' ? (
          <div className="bg-white dark:bg-[#2f2f2f] border border-black/10 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm transition-colors duration-200">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-4">{t('admin.manageUsers')}</h2>
              {isLoadingUsers ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-zinc-400 dark:text-zinc-500" /></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-black/10 dark:border-white/10 text-zinc-500 dark:text-zinc-400 text-sm transition-colors">
                        <th className="py-3 px-4 font-medium">Usuário</th>
                        <th className="py-3 px-4 font-medium">{t('profile.role')}</th>
                        <th className="py-3 px-4 font-medium">{t('admin.status')}</th>
                        <th className="py-3 px-4 font-medium text-right">{t('admin.actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usersList.map(u => {
                        const isOnline = u.isOnline && u.lastActive && (Date.now() - u.lastActive < 120000);
                        return (
                        <tr key={u.id} className="border-b border-black/5 dark:border-white/5 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors">
                          <td className="py-3 px-4 text-zinc-700 dark:text-zinc-300">
                            <div className="font-medium">{u.username || 'Sem nome'}</div>
                            {u.role !== 'admin' && <div className="text-xs text-zinc-500">{u.email}</div>}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${u.role === 'admin' ? 'bg-zinc-900 dark:bg-white/10 text-white dark:text-white border border-transparent dark:border-white/20' : 'bg-zinc-100 dark:bg-[#212121] text-zinc-600 dark:text-zinc-400 border border-black/10 dark:border-white/10'}`}>
                              {u.role === 'admin' ? t('profile.admin') : t('profile.member')}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-zinc-400 dark:bg-zinc-600'}`}></span>
                              <span className="text-sm text-zinc-500 dark:text-zinc-400">{isOnline ? t('admin.online') : t('admin.offline')}</span>
                              {u.isBanned && (
                                <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400 uppercase tracking-wider">
                                  Banido
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setEditingUser({ id: u.id, username: u.username || '', role: u.role })}
                                disabled={u.email === 'pedronobreneto27@gmail.com' || u.email === 'pedronobreneto@gmail.com'}
                                className="text-sm px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-[#212121] hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-black/10 dark:border-white/10"
                              >
                                Editar
                              </button>
                              <button
                                onClick={() => toggleUserBan(u.id, !!u.isBanned)}
                                disabled={u.email === 'pedronobreneto27@gmail.com' || u.email === 'pedronobreneto@gmail.com'}
                                className={`text-sm px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed border ${
                                  u.isBanned 
                                    ? 'bg-emerald-100/50 text-emerald-700 hover:bg-emerald-100 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20 dark:border-emerald-500/20' 
                                    : 'bg-red-50 text-red-600 hover:bg-red-100 border-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 dark:border-red-500/20'
                                }`}
                              >
                                {u.isBanned ? 'Desbanir' : 'Banir'}
                              </button>
                              <button
                                onClick={() => kickUser(u.id)}
                                disabled={u.email === 'pedronobreneto27@gmail.com' || u.email === 'pedronobreneto@gmail.com'}
                                className="text-sm px-3 py-1.5 rounded-lg bg-red-100/50 text-red-700 hover:bg-red-100 border border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 dark:border-red-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Expulsar
                              </button>
                            </div>
                          </td>
                        </tr>
                      )})}
                      {usersList.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-zinc-500">
                            {t('admin.noUsers')}
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
          <div className="bg-white dark:bg-[#2f2f2f] border border-black/10 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm transition-colors duration-200">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">{t('admin.manageFix')}</h2>
                <button
                  onClick={saveFixData}
                  disabled={saveFixStatus === 'saving'}
                  className={`flex items-center gap-2 px-6 py-2 rounded-xl font-medium transition-colors ${
                    saveFixStatus === 'success' ? 'bg-emerald-600 text-white' :
                    saveFixStatus === 'error' ? 'bg-red-600 text-white' :
                    'bg-zinc-900 dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200'
                  }`}
                >
                  {saveFixStatus === 'success' ? <CheckCircle2 className="w-4 h-4" /> :
                   saveFixStatus === 'error' ? <AlertTriangle className="w-4 h-4" /> :
                   <Save className="w-4 h-4" />}
                  {saveFixStatus === 'saving' ? t('admin.saving') :
                   saveFixStatus === 'success' ? t('admin.success') :
                   saveFixStatus === 'error' ? t('admin.error') :
                   t('admin.saveFix')}
                </button>
              </div>
              
              {isLoadingFix ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-zinc-400 dark:text-zinc-500" /></div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl p-5 mb-6 transition-colors">
                    <h3 className="text-blue-700 dark:text-blue-400 font-medium mb-2 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5" />
                      {t('admin.fileHosting')}
                    </h3>
                    <p className="text-blue-600 dark:text-blue-300/80 text-sm leading-relaxed">
                      {t('admin.fileHostingDesc')}
                    </p>
                  </div>

                  {/* Upload Area */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors ${
                      isDragging ? 'border-pink-500 bg-pink-50 dark:bg-pink-500/5' : 'border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 hover:bg-zinc-50 dark:hover:bg-white/5'
                    }`}
                  >
                    <input
                      type="file"
                      id="fix-upload"
                      className="hidden"
                      onChange={(e) => e.target.files && handleFileUpload(e.target.files[0])}
                    />
                    <label htmlFor="fix-upload" className="cursor-pointer flex flex-col items-center">
                      <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-[#212121] flex items-center justify-center mb-4 transition-colors">
                        <Upload className="w-8 h-8 text-zinc-400" />
                      </div>
                      <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-2">
                        {t('admin.dragFile')}
                      </h3>
                      <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-4">
                        {t('admin.orClick')}
                      </p>
                      {uploadProgress !== null && (
                        <div className="w-full max-w-xs mx-auto">
                          <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                            <span>{t('admin.uploading')}</span>
                            <span>{Math.round(uploadProgress)}%</span>
                          </div>
                          <div className="w-full bg-zinc-200 dark:bg-[#171717] rounded-full h-2 overflow-hidden transition-colors">
                            <div
                              className="bg-pink-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${uploadProgress}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-400 mb-2">{t('admin.fixTitle')}</label>
                    <input
                      type="text"
                      value={fixData.title}
                      onChange={(e) => setFixData({ ...fixData, title: e.target.value })}
                      className="w-full bg-zinc-50 dark:bg-[#212121] border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-zinc-900 dark:text-white focus:outline-none focus:border-black/20 dark:focus:border-white/20 transition-colors"
                      placeholder={t('admin.fixTitlePlaceholder')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-400 mb-2">{t('admin.fixVersion')}</label>
                    <input
                      type="text"
                      value={fixData.version}
                      onChange={(e) => setFixData({ ...fixData, version: e.target.value })}
                      className="w-full bg-zinc-50 dark:bg-[#212121] border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-zinc-900 dark:text-white focus:outline-none focus:border-black/20 dark:focus:border-white/20 transition-colors"
                      placeholder={t('admin.fixVersionPlaceholder')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-400 mb-2">{t('admin.fixLink')}</label>
                    <input
                      type="url"
                      value={fixData.downloadUrl}
                      onChange={(e) => setFixData({ ...fixData, downloadUrl: e.target.value })}
                      className="w-full bg-zinc-50 dark:bg-[#212121] border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-zinc-900 dark:text-white focus:outline-none focus:border-black/20 dark:focus:border-white/20 transition-colors"
                      placeholder="Ex: https://link-para-o-arquivo.com/fix.zip"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-400 mb-2">{t('admin.fixDesc')}</label>
                    <textarea
                      value={fixData.description}
                      onChange={(e) => setFixData({ ...fixData, description: e.target.value })}
                      className="w-full bg-zinc-50 dark:bg-[#212121] border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-zinc-900 dark:text-white focus:outline-none focus:border-black/20 dark:focus:border-white/20 transition-colors min-h-[150px] resize-y"
                      placeholder={t('admin.fixDescPlaceholder')}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'bot' ? (
          <div className="bg-white dark:bg-[#2f2f2f] border border-black/10 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm transition-colors duration-200">
            <div className="bg-zinc-50 dark:bg-[#2f2f2f] px-6 py-4 border-b border-black/10 dark:border-white/10 flex items-center justify-between transition-colors duration-200">
              <div className="flex items-center gap-3">
                <Bot className="w-5 h-5 text-zinc-900 dark:text-white" />
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">{t('admin.botSettings')}</h2>
              </div>
              <button
                onClick={saveBotSettings}
                disabled={saveBotStatus === 'saving'}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors ${
                  saveBotStatus === 'success' ? 'bg-emerald-600 text-white' :
                  saveBotStatus === 'error' ? 'bg-red-600 text-white' :
                  'bg-zinc-900 dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200'
                }`}
              >
                {saveBotStatus === 'success' ? <CheckCircle2 className="w-4 h-4" /> :
                 saveBotStatus === 'error' ? <AlertTriangle className="w-4 h-4" /> :
                 <Save className="w-4 h-4" />}
                {saveBotStatus === 'saving' ? t('admin.saving') :
                 saveBotStatus === 'success' ? t('admin.success') :
                 saveBotStatus === 'error' ? t('admin.error') :
                 t('admin.saveSettings')}
              </button>
            </div>
            <div className="p-6">
              {isLoadingBot ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-4 border-zinc-900 dark:border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <div className="space-y-6 max-w-2xl">
                  <div className="bg-zinc-50 dark:bg-[#212121] border border-black/10 dark:border-white/10 rounded-xl p-6 flex flex-col sm:flex-row gap-6 items-center justify-between transition-colors duration-200">
                    <div>
                      <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-1">{t('admin.botStatus')}</h3>
                      <p className="text-zinc-600 dark:text-zinc-400 text-sm">{t('admin.botStatusDesc')}</p>
                      {botStatus === 'error' && (
                        <p className="text-xs text-red-500 dark:text-red-400 mt-2 bg-red-50 dark:bg-red-500/10 p-2 rounded border border-red-200 dark:border-red-500/20">
                          {t('admin.botError')} {botErrorReason}
                        </p>
                      )}
                    </div>
                    <div className="text-center shrink-0">
                      {botStatus === 'checking' ? (
                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-100 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-500 text-sm font-medium border border-yellow-200 dark:border-yellow-500/20 transition-colors">
                          <Loader2 className="w-4 h-4 animate-spin" /> {t('admin.botChecking')}
                        </span>
                      ) : botStatus === 'online' ? (
                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-500 text-sm font-medium border border-emerald-200 dark:border-emerald-500/20 transition-colors">
                          <CheckCircle2 className="w-4 h-4" /> {t('admin.botOnline')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-500 text-sm font-medium border border-red-200 dark:border-red-500/20 transition-colors">
                          <AlertTriangle className="w-4 h-4" /> {t('admin.botApiError')}
                        </span>
                      )}
                      <button onClick={checkBotStatus} className="block mt-2 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors mx-auto">
                        {t('admin.botTestAgain')}
                      </button>
                    </div>
                  </div>

                  <div className="bg-zinc-50 dark:bg-[#212121] border border-black/10 dark:border-white/10 rounded-xl p-6 flex flex-col sm:flex-row gap-6 items-center justify-between transition-colors duration-200">
                    <div>
                      <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-1">{t('admin.dailyUsage')}</h3>
                      <p className="text-zinc-600 dark:text-zinc-400 text-sm">{t('admin.dailyUsageDesc')}</p>
                      <p className="text-xs text-zinc-500 mt-1">{t('admin.lastReset')} {botSettings.lastResetDate || t('admin.never')}</p>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-zinc-900 dark:text-white">
                        {botSettings.dailyGenerations} <span className="text-zinc-400 dark:text-zinc-500 text-xl">/ {botSettings.dailyLimit}</span>
                      </div>
                      <div className="w-full bg-zinc-200 dark:bg-[#2f2f2f] rounded-full h-2 mt-3 overflow-hidden transition-colors">
                        <div 
                          className={`h-2 rounded-full ${botSettings.dailyGenerations >= botSettings.dailyLimit ? 'bg-red-500' : 'bg-zinc-900 dark:bg-white'}`}
                          style={{ width: `${Math.min(100, (botSettings.dailyGenerations / botSettings.dailyLimit) * 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* Chat Logs */}
                  <div className="bg-zinc-50 dark:bg-[#212121] border border-black/10 dark:border-white/10 rounded-xl overflow-hidden transition-colors duration-200">
                    <div className="px-6 py-4 border-b border-black/10 dark:border-white/10 transition-colors">
                      <h3 className="text-lg font-medium text-zinc-900 dark:text-white">{t('admin.chatLogs')}</h3>
                      <p className="text-zinc-600 dark:text-zinc-400 text-sm">{t('admin.chatLogsDesc')}</p>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {chatLogs.length === 0 ? (
                        <div className="p-6 text-center text-zinc-500">{t('admin.noLogs')}</div>
                      ) : (
                        <div className="divide-y divide-black/5 dark:divide-white/5 transition-colors">
                          {chatLogs.map((log) => (
                            <div key={log.id} className="p-4 hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors">
                              <div className="flex justify-between items-start mb-2">
                                <div className="text-sm font-medium text-zinc-900 dark:text-white">{log.username || log.userEmail}</div>
                                <div className="text-xs text-zinc-500">
                                  {new Date(log.timestamp).toLocaleString(language === 'pt-BR' ? 'pt-BR' : 'en-US')}
                                </div>
                              </div>
                              <p className="text-sm text-zinc-700 dark:text-zinc-300 bg-white dark:bg-[#171717] p-3 rounded-lg border border-black/5 dark:border-white/5 transition-colors">
                                {log.question}
                              </p>
                            </div>
                          ))}
                          {hasMoreLogs && (
                            <div className="p-4 text-center">
                              <button
                                onClick={() => fetchChatLogs(true)}
                                disabled={isLoadingLogs}
                                className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white bg-zinc-100 dark:bg-[#212121] hover:bg-zinc-200 dark:hover:bg-white/5 rounded-xl transition-colors border border-black/10 dark:border-white/10 disabled:opacity-50"
                              >
                                {isLoadingLogs ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Carregar mais'}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-400 mb-2">{t('admin.globalLimit')}</label>
                    <input
                      type="number"
                      min="1"
                      value={botSettings.dailyLimit}
                      onChange={(e) => setBotSettings({ ...botSettings, dailyLimit: parseInt(e.target.value) || 100 })}
                      className="w-full bg-zinc-50 dark:bg-[#212121] border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-zinc-900 dark:text-white focus:outline-none focus:border-black/20 dark:focus:border-white/20 transition-colors"
                      placeholder="Ex: 1000"
                    />
                    <p className="text-xs text-zinc-500 mt-2">
                      {t('admin.globalLimitDesc')}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-400 mb-2">{t('admin.userLimit')}</label>
                    <input
                      type="number"
                      min="1"
                      value={botSettings.userDailyLimit}
                      onChange={(e) => setBotSettings({ ...botSettings, userDailyLimit: parseInt(e.target.value) || 10 })}
                      className="w-full bg-zinc-50 dark:bg-[#212121] border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-zinc-900 dark:text-white focus:outline-none focus:border-black/20 dark:focus:border-white/20 transition-colors"
                      placeholder="Ex: 10"
                    />
                    <p className="text-xs text-zinc-500 mt-2">
                      {t('admin.userLimitDesc')}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-400 mb-2">{t('admin.rpmLimit')}</label>
                    <input
                      type="number"
                      min="1"
                      value={botSettings.rpmLimit}
                      onChange={(e) => setBotSettings({ ...botSettings, rpmLimit: parseInt(e.target.value) || 15 })}
                      className="w-full bg-zinc-50 dark:bg-[#212121] border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-zinc-900 dark:text-white focus:outline-none focus:border-black/20 dark:focus:border-white/20 transition-colors"
                      placeholder="Ex: 15"
                    />
                    <p className="text-xs text-zinc-500 mt-2">
                      {t('admin.rpmLimitDesc')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'logs' && isSuperAdmin ? (
          <div className="bg-white dark:bg-[#2f2f2f] border border-black/10 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm transition-colors duration-200">
            <div className="px-6 py-4 border-b border-black/10 dark:border-white/10 flex items-center justify-between transition-colors">
              <div>
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">Logs de Atividade</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Histórico de ações administrativas.</p>
              </div>
            </div>
            <div className="p-6">
              <div className="max-h-[600px] overflow-y-auto">
                {adminLogs.length === 0 ? (
                  <div className="text-center text-zinc-500 py-8">Nenhum log encontrado.</div>
                ) : (
                  <div className="divide-y divide-black/5 dark:divide-white/5">
                    {adminLogs.map((log) => (
                      <div key={log.id} className="py-4">
                        <div className="flex justify-between items-start mb-1">
                          <div className="font-medium text-zinc-900 dark:text-white">{log.action}</div>
                          <div className="text-xs text-zinc-500">
                            {new Date(log.timestamp).toLocaleString(language === 'pt-BR' ? 'pt-BR' : 'en-US')}
                          </div>
                        </div>
                        <div className="text-sm text-zinc-600 dark:text-zinc-400">
                          <span className="font-medium">Usuário:</span> {log.userEmail}
                        </div>
                        <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1 bg-zinc-50 dark:bg-[#212121] p-3 rounded-lg border border-black/5 dark:border-white/5">
                          {log.details}
                        </div>
                      </div>
                    ))}
                    {hasMoreAdminLogs && (
                      <div className="pt-4 text-center">
                        <button
                          onClick={() => fetchAdminLogs(true)}
                          disabled={isLoadingAdminLogs}
                          className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white bg-zinc-100 dark:bg-[#212121] hover:bg-zinc-200 dark:hover:bg-white/5 rounded-xl transition-colors border border-black/10 dark:border-white/10 disabled:opacity-50"
                        >
                          {isLoadingAdminLogs ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Carregar mais'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
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
            className="bg-white dark:bg-[#2f2f2f] border border-black/10 dark:border-white/10 rounded-2xl p-6 max-w-md w-full shadow-sm transition-colors duration-200"
          >
            <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">{confirmModal.title}</h3>
            <p className="text-zinc-600 dark:text-zinc-400 mb-6">{confirmModal.message}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white bg-zinc-100 dark:bg-[#212121] hover:bg-zinc-200 dark:hover:bg-white/5 rounded-xl transition-colors border border-black/10 dark:border-white/10"
              >
                {t('admin.cancel')}
              </button>
              <button
                onClick={() => {
                  try {
                    confirmModal.onConfirm();
                  } catch (err) {
                    console.error("Error in onConfirm:", err);
                  }
                  setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors"
              >
                {t('admin.confirm')}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-[#2f2f2f] border border-black/10 dark:border-white/10 rounded-2xl p-6 max-w-md w-full shadow-sm transition-colors duration-200"
          >
            <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-4">Editar Usuário</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-400 mb-1">Nome de usuário</label>
                <input
                  type="text"
                  value={editingUser.username}
                  onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                  className="w-full bg-zinc-50 dark:bg-[#212121] border border-black/10 dark:border-white/10 rounded-xl px-4 py-2 text-zinc-900 dark:text-white focus:outline-none focus:border-black/20 dark:focus:border-white/20 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-400 mb-1">Cargo</label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                  className="w-full bg-zinc-50 dark:bg-[#212121] border border-black/10 dark:border-white/10 rounded-xl px-4 py-2 text-zinc-900 dark:text-white focus:outline-none focus:border-black/20 dark:focus:border-white/20 transition-colors"
                >
                  <option value="user">Membro</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white bg-zinc-100 dark:bg-[#212121] hover:bg-zinc-200 dark:hover:bg-white/5 rounded-xl transition-colors border border-black/10 dark:border-white/10"
              >
                Cancelar
              </button>
              <button
                onClick={saveUserEdit}
                className="px-4 py-2 text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 rounded-xl transition-colors"
              >
                Salvar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
