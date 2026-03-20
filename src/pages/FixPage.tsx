import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Wrench, Download, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { db, doc, getDoc } from '../firebase';
import DiscordMarkdown from '../components/DiscordMarkdown';

interface FixData {
  title: string;
  description: string;
  version: string;
  downloadUrl: string;
  updatedAt: string;
}

export default function FixPage() {
  const [fixData, setFixData] = useState<FixData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFixData = async () => {
      try {
        const docRef = doc(db, 'content', 'game_fix');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setFixData(docSnap.data() as FixData);
        }
      } catch (error) {
        console.error("Error fetching fix data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFixData();
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-500/10 text-indigo-400 mb-6">
            <Wrench className="w-8 h-8" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">Correção do Jogo</h1>
          <p className="text-zinc-400 text-lg">Baixe a versão mais recente do arquivo de correção para garantir que o jogo funcione perfeitamente.</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          </div>
        ) : fixData && fixData.title ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl"
          >
            <div className="p-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">{fixData.title}</h2>
                  <div className="flex items-center gap-4 text-sm text-zinc-400">
                    <span className="flex items-center gap-1 bg-zinc-800 px-2 py-1 rounded-md">
                      <Wrench className="w-4 h-4" />
                      Versão {fixData.version}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      Atualizado em: {fixData.updatedAt}
                    </span>
                  </div>
                </div>
                <a
                  href={fixData.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-colors shadow-lg shadow-indigo-500/20 shrink-0"
                >
                  <Download className="w-5 h-5" />
                  Baixar Correção
                </a>
              </div>

              <div className="prose prose-invert max-w-none">
                <h3 className="text-lg font-semibold text-white mb-4">Detalhes da Atualização</h3>
                <div className="bg-zinc-950 rounded-xl p-6 border border-zinc-800/50">
                  <DiscordMarkdown>
                    {fixData.description}
                  </DiscordMarkdown>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="text-center py-12 bg-zinc-900/50 rounded-2xl border border-zinc-800">
            <AlertCircle className="w-12 h-12 text-zinc-500 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-white mb-2">Nenhuma correção disponível</h3>
            <p className="text-zinc-400">No momento, não há arquivos de correção publicados.</p>
          </div>
        )}
      </div>
    </div>
  );
}
