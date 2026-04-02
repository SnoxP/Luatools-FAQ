import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Wrench, Download, Clock, AlertCircle, Loader2, Edit } from 'lucide-react';
import { db, doc, getDoc } from '../firebase';
import DiscordMarkdown from '../components/DiscordMarkdown';
import { useFaq } from '../context/FaqContext';
import { useNavigate } from 'react-router-dom';

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
  const { isAdmin } = useFaq();
  const navigate = useNavigate();

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
    <div className="min-h-full bg-[#212121] text-zinc-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#2f2f2f] border border-white/10 text-zinc-300 mb-6">
            <Wrench className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-semibold text-white mb-3">Correção do Jogo</h1>
          <p className="text-zinc-400 text-base">Baixe a versão mais recente do arquivo de correção para garantir que o jogo funcione perfeitamente.</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
          </div>
        ) : fixData && fixData.title ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#2f2f2f] border border-white/10 rounded-2xl overflow-hidden shadow-sm"
          >
            <div className="p-6 sm:p-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b border-white/10 pb-6">
                <div>
                  <h2 className="text-xl font-semibold text-white mb-3">{fixData.title}</h2>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-400">
                    <span className="flex items-center gap-1.5 bg-[#212121] px-2.5 py-1 rounded-lg border border-white/5">
                      <Wrench className="w-4 h-4" />
                      Versão {fixData.version}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      Atualizado em: {fixData.updatedAt}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <a
                    href={fixData.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white text-black font-medium rounded-xl hover:bg-zinc-200 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Baixar
                  </a>
                  {isAdmin && (
                    <button
                      onClick={() => navigate('/admin?tab=fix')}
                      className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#212121] hover:bg-white/5 text-zinc-300 font-medium rounded-xl border border-white/10 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                      Editar
                    </button>
                  )}
                </div>
              </div>

              <div className="prose prose-invert max-w-none">
                <h3 className="text-base font-medium text-white mb-4">Detalhes da Atualização</h3>
                <div className="bg-[#212121] rounded-xl p-5 border border-white/5">
                  <DiscordMarkdown className="text-[15px] leading-relaxed text-zinc-300">
                    {fixData.description}
                  </DiscordMarkdown>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="text-center py-12 bg-[#2f2f2f] rounded-2xl border border-white/10">
            <AlertCircle className="w-10 h-10 text-zinc-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">Nenhuma correção disponível</h3>
            <p className="text-zinc-400 text-sm">No momento, não há arquivos de correção publicados.</p>
          </div>
        )}
      </div>
    </div>
  );
}
