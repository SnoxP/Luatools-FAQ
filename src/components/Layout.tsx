import React, { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Menu, X, MessageSquare, ShieldAlert, Home, Settings, Wrench, User as UserIcon, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFaq } from '../context/FaqContext';

export default function Layout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { user, isAdmin } = useFaq();

  const navLinks = [
    { name: 'Início', path: '/', icon: <Home className="w-5 h-5 mr-3" /> },
    { name: 'FAQ', path: '/faq', icon: <MessageSquare className="w-5 h-5 mr-3" /> },
    { name: 'Fix', path: '/fix', icon: <Wrench className="w-5 h-5 mr-3" /> },
  ];

  if (user) {
    if (isAdmin) {
      navLinks.push({ name: 'Painel Admin', path: '/admin', icon: <Settings className="w-5 h-5 mr-3" /> });
    } else {
      navLinks.push({ name: 'Perfil', path: '/perfil', icon: <UserIcon className="w-5 h-5 mr-3" /> });
    }
  } else {
    navLinks.push({ name: 'Login', path: '/admin', icon: <Settings className="w-5 h-5 mr-3" /> });
  }

  return (
    <div className="flex h-screen bg-[#212121] text-zinc-100 font-sans overflow-hidden">
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-12 bg-[#212121] flex items-center justify-between px-4 z-50 border-b border-white/10">
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-1 text-zinc-400 hover:text-white focus:outline-none"
        >
          <Menu className="w-6 h-6" />
        </button>
        <span className="font-medium text-zinc-200">LuaTools</span>
        <div className="w-6"></div> {/* Spacer for centering */}
      </div>

      {/* Sidebar */}
      <AnimatePresence>
        {(isMobileMenuOpen || window.innerWidth >= 768) && (
          <>
            {/* Mobile Overlay */}
            {isMobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMobileMenuOpen(false)}
                className="md:hidden fixed inset-0 bg-black/50 z-40"
              />
            )}

            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-[#171717] flex flex-col transition-transform duration-300 ease-in-out ${
                isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
              }`}
            >
              <div className="p-3">
                <Link
                  to="/"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-white/5 transition-colors group"
                >
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center overflow-hidden shrink-0">
                    <img src="https://i.ibb.co/PZ9nPk1f/image.png" alt="LuaTools Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <span className="font-medium text-sm text-zinc-200 group-hover:text-white transition-colors">LuaTools</span>
                </Link>
              </div>

              <div className="flex-1 overflow-y-auto py-2 px-3 space-y-1">
                {navLinks.map((link) => {
                  const isActive = location.pathname === link.path;
                  return (
                    <Link
                      key={link.name}
                      to={link.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-white/10 text-white'
                          : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
                      }`}
                    >
                      {link.icon}
                      {link.name}
                    </Link>
                  );
                })}
              </div>

              <div className="p-3 border-t border-white/10">
                <a
                  href="https://ptb.discord.com/channels/1408201417834893385/1464812261611933839"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center px-3 py-3 rounded-lg text-sm font-medium text-zinc-400 hover:bg-white/5 hover:text-zinc-200 transition-colors"
                >
                  <MessageSquare className="w-5 h-5 mr-3" />
                  Discord
                </a>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full relative w-full md:w-[calc(100%-16rem)] pt-12 md:pt-0">
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
