import React, { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Menu, X, MessageSquare, ShieldAlert, Home, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Layout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { name: 'Início', path: '/', icon: <Home className="w-4 h-4 mr-2" /> },
    { name: 'FAQ', path: '/faq', icon: <MessageSquare className="w-4 h-4 mr-2" /> },
    { name: 'Admin', path: '/admin', icon: <Settings className="w-4 h-4 mr-2" /> },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans flex flex-col">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center gap-2 group">
                <img src="https://i.ibb.co/YF6rWDKK/image.png" alt="LuaTools Logo" className="w-8 h-8 rounded-lg object-cover" referrerPolicy="no-referrer" />
                <span className="text-xl font-bold tracking-tight text-white">LuaTools</span>
              </Link>
            </div>
            
            {/* Desktop Menu */}
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                {navLinks.map((link) => {
                  const isActive = location.pathname === link.path;
                  return (
                    <Link
                      key={link.name}
                      to={link.path}
                      className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActive 
                          ? 'bg-zinc-800 text-white' 
                          : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                      }`}
                    >
                      {link.icon}
                      {link.name}
                    </Link>
                  );
                })}
                <a
                  href="https://discord.gg/luatools"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-4 flex items-center px-4 py-2 rounded-full text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/20"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Abrir Ticket
                </a>
              </div>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 focus:outline-none"
              >
                {isMobileMenuOpen ? <X className="block h-6 w-6" /> : <Menu className="block h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-zinc-900 border-b border-zinc-800"
            >
              <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                {navLinks.map((link) => {
                  const isActive = location.pathname === link.path;
                  return (
                    <Link
                      key={link.name}
                      to={link.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${
                        isActive 
                          ? 'bg-zinc-800 text-white' 
                          : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                      }`}
                    >
                      {link.icon}
                      {link.name}
                    </Link>
                  );
                })}
                <a
                  href="https://discord.gg/luatools"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 flex items-center justify-center w-full px-4 py-2 rounded-md text-base font-medium bg-indigo-600 text-white hover:bg-indigo-500"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Abrir Ticket no Discord
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Main Content */}
      <main className="flex-1 relative">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-zinc-950 border-t border-zinc-900 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <img src="https://i.ibb.co/YF6rWDKK/image.png" alt="LuaTools Logo" className="w-6 h-6 rounded object-cover" referrerPolicy="no-referrer" />
            <span className="text-zinc-400 text-sm">© {new Date().getFullYear()} LuaTools. Todos os direitos reservados.</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-zinc-500">
            <Link to="/faq" className="hover:text-zinc-300 transition-colors">FAQ</Link>
            <a href="https://discord.gg/luatools" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-300 transition-colors">Discord</a>
            <Link to="/admin" className="hover:text-zinc-300 transition-colors">Admin</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
