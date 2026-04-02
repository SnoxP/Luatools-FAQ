import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useFaq } from '../context/FaqContext';
import { User as UserIcon, LogOut, Save, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { db, doc, getDoc, setDoc } from '../firebase';
import { useNavigate } from 'react-router-dom';

export default function ProfilePage() {
  const { user, isAdmin, isAuthReady, logout } = useFaq();
  const navigate = useNavigate();
  
  const [username, setUsername] = useState('');
  const [discordId, setDiscordId] = useState('');
  const [bio, setBio] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (isAuthReady && !user) {
      navigate('/admin');
    }
  }, [user, isAuthReady, navigate]);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.username) setUsername(data.username);
          if (data.discordId) setDiscordId(data.discordId);
          if (data.bio) setBio(data.bio);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchUserData();
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaveStatus('saving');
    try {
      await setDoc(doc(db, 'users', user.uid), {
        username: username,
        discordId: discordId,
        bio: bio
      }, { merge: true });
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error("Error updating profile:", error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  if (!isAuthReady || isLoading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-[#212121]">
        <Loader2 className="w-8 h-8 text-zinc-500 animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-full bg-[#212121] text-zinc-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#2f2f2f] border border-white/10 rounded-2xl overflow-hidden shadow-sm"
        >
          <div className="bg-[#2f2f2f] px-6 sm:px-8 py-6 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[#212121] rounded-xl border border-white/5">
                <UserIcon className="w-5 h-5 text-zinc-300" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-white">Meu Perfil</h1>
                <p className="text-zinc-400 text-sm">Gerencie suas informações pessoais</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium bg-[#212121] text-zinc-300 hover:bg-white/5 hover:text-white transition-colors border border-white/10"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </div>

          <div className="p-6 sm:p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">E-mail</label>
                <input
                  type="email"
                  value={user.email || ''}
                  disabled
                  className="w-full bg-[#212121]/50 border border-white/5 rounded-xl px-4 py-3 text-zinc-500 cursor-not-allowed text-[15px]"
                />
                <p className="text-xs text-zinc-500 mt-2">O e-mail não pode ser alterado.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Nome de Usuário</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Como quer ser chamado?"
                  className="w-full bg-[#212121] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/20 transition-colors text-[15px]"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">ID do Discord</label>
                <input
                  type="text"
                  value={discordId}
                  onChange={(e) => setDiscordId(e.target.value)}
                  placeholder="Ex: 123456789012345678"
                  className="w-full bg-[#212121] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/20 transition-colors text-[15px]"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-zinc-400 mb-2">Biografia</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Conte um pouco sobre você..."
                  rows={3}
                  className="w-full bg-[#212121] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/20 transition-colors resize-none text-[15px]"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Cargo</label>
                <div className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-[#212121] text-zinc-300 border border-white/5">
                  {isAdmin ? 'Administrador' : 'Membro'}
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-white/10 flex justify-end">
              <button
                onClick={handleSave}
                disabled={saveStatus === 'saving'}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-colors ${
                  saveStatus === 'success' ? 'bg-emerald-600 text-white' :
                  saveStatus === 'error' ? 'bg-red-600 text-white' :
                  'bg-white text-black hover:bg-zinc-200'
                }`}
              >
                {saveStatus === 'success' ? <CheckCircle2 className="w-4 h-4" /> :
                 saveStatus === 'error' ? <AlertTriangle className="w-4 h-4" /> :
                 <Save className="w-4 h-4" />}
                {saveStatus === 'saving' ? 'Salvando...' :
                 saveStatus === 'success' ? 'Salvo com sucesso!' :
                 saveStatus === 'error' ? 'Erro ao salvar' :
                 'Salvar Alterações'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
