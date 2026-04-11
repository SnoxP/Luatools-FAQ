/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import FaqPage from './pages/FaqPage';
import AdminPage from './pages/AdminPage';
import FixPage from './pages/FixPage';
import ProfilePage from './pages/ProfilePage';
import DonatePage from './pages/DonatePage';
import DiscordCallback from './pages/DiscordCallback';
import { FaqProvider, useFaq } from './context/FaqContext';
import { SettingsProvider } from './context/SettingsContext';
import { ChatProvider } from './context/ChatContext';
import { ShieldAlert } from 'lucide-react';

function AppContent() {
  const { isMaintenanceMode, isAdmin, isAuthReady } = useFaq();

  if (isMaintenanceMode && !isAdmin && isAuthReady) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-[#212121] flex flex-col items-center justify-center p-4 text-center">
        <div className="bg-white dark:bg-[#171717] p-8 rounded-2xl shadow-sm border border-black/10 dark:border-white/10 max-w-md w-full">
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-4">Site em Manutenção</h1>
          <p className="text-zinc-600 dark:text-zinc-400 mb-6">
            Estamos realizando testes e atualizações no sistema. O acesso está temporariamente restrito apenas para administradores.
          </p>
          <p className="text-sm text-zinc-500 dark:text-zinc-500">
            Por favor, tente novamente mais tarde.
          </p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="faq" element={<FaqPage />} />
          <Route path="fix" element={<FixPage />} />
          <Route path="painel-admin" element={<AdminPage />} />
          <Route path="perfil" element={<ProfilePage />} />
          <Route path="donate" element={<DonatePage />} />
        </Route>
        <Route path="/callback" element={<DiscordCallback />} />
      </Routes>
    </Router>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <FaqProvider>
        <ChatProvider>
          <AppContent />
        </ChatProvider>
      </FaqProvider>
    </SettingsProvider>
  );
}
