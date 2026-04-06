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
import { FaqProvider } from './context/FaqContext';
import { SettingsProvider } from './context/SettingsContext';
import { ChatProvider } from './context/ChatContext';

export default function App() {
  return (
    <SettingsProvider>
      <FaqProvider>
        <ChatProvider>
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
            </Routes>
          </Router>
        </ChatProvider>
      </FaqProvider>
    </SettingsProvider>
  );
}
