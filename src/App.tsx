/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import FaqPage from './pages/FaqPage';
import AdminPage from './pages/AdminPage';
import Chatbot from './components/Chatbot';
import { FaqProvider } from './context/FaqContext';

export default function App() {
  return (
    <FaqProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="faq" element={<FaqPage />} />
            <Route path="admin" element={<AdminPage />} />
          </Route>
        </Routes>
        <Chatbot />
      </Router>
    </FaqProvider>
  );
}
