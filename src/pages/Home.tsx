import React from 'react';
import { motion, Variants } from 'framer-motion';
import { Search, MessageSquare, ShieldCheck, Zap, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Home() {
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: 'spring', stiffness: 100 },
    },
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 overflow-hidden">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-zinc-950 to-zinc-950"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="text-center max-w-3xl mx-auto"
          >
            <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-sm font-medium mb-6 border border-indigo-500/20">
              <Zap className="w-4 h-4" />
              <span>Suporte Oficial LuaTools</span>
            </motion.div>
            
            <motion.h1 variants={itemVariants} className="text-5xl lg:text-7xl font-bold tracking-tight text-white mb-6">
              Como podemos <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">ajudar você?</span>
            </motion.h1>
            
            <motion.p variants={itemVariants} className="text-lg text-zinc-400 mb-10">
              Encontre respostas rápidas para suas dúvidas sobre instalação, erros e fixes. 
              Nosso assistente virtual e base de conhecimento estão prontos para ajudar.
            </motion.p>
            
            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/faq"
                className="w-full sm:w-auto px-8 py-4 rounded-full bg-indigo-600 text-white font-medium hover:bg-indigo-500 transition-all shadow-[0_0_40px_-10px_rgba(79,70,229,0.5)] flex items-center justify-center gap-2"
              >
                <Search className="w-5 h-5" />
                Acessar Base de Conhecimento
              </Link>
              <a
                href="https://ptb.discord.com/channels/1408201417834893385/1464812261611933839"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-8 py-4 rounded-full bg-zinc-800 text-white font-medium hover:bg-zinc-700 transition-all border border-zinc-700 flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-5 h-5" />
                Pedir ajuda no servidor
              </a>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-zinc-900/50 border-y border-zinc-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-indigo-500/50 transition-colors group"
            >
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-4 group-hover:scale-110 transition-transform">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Busca Inteligente</h3>
              <p className="text-zinc-400">
                Encontre exatamente o que precisa com nossa busca rápida e sugestões automáticas no FAQ.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-cyan-500/50 transition-colors group"
            >
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 mb-4 group-hover:scale-110 transition-transform">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Chatbot IA</h3>
              <p className="text-zinc-400">
                Tire dúvidas instantaneamente com nosso assistente virtual treinado exclusivamente com nosso FAQ.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-emerald-500/50 transition-colors group"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Suporte Oficial</h3>
              <p className="text-zinc-400">
                Informações verificadas e atualizadas diretamente pela equipe de administração do LuaTools.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-indigo-600/5"></div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Ainda não encontrou a solução?</h2>
          <p className="text-zinc-400 mb-8 text-lg">
            Nossa equipe de suporte está pronta para ajudar você no Discord. 
            Peça ajuda no servidor e descreva seu problema detalhadamente.
          </p>
          <a
            href="https://ptb.discord.com/channels/1408201417834893385/1464812261611933839"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-8 py-4 rounded-full bg-white text-zinc-950 font-bold hover:bg-zinc-200 transition-colors gap-2"
          >
            Pedir ajuda no servidor
            <ArrowRight className="w-5 h-5" />
          </a>
        </div>
      </section>
    </div>
  );
}
