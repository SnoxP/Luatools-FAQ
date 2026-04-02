import React from 'react';
import { Heart } from 'lucide-react';

export default function DonatePage() {
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="bg-[#171717] rounded-xl p-8 border border-white/10 text-center">
        <Heart className="w-16 h-16 text-pink-500 mx-auto mb-6" />
        <h1 className="text-3xl font-bold text-white mb-4">Apoie o LuaTools</h1>
        <p className="text-zinc-400 mb-8">
          O LuaTools é mantido com muito carinho. Se você gosta do projeto e quer ajudar a manter os servidores e o desenvolvimento, considere fazer uma doação!
        </p>
        <div className="space-y-4">
          <a
            href="https://livepix.gg/luatools"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full py-3 bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-lg transition-colors"
          >
            Doar via LivePix
          </a>
          <p className="text-xs text-zinc-500 mt-4">
            Qualquer valor é muito bem-vindo e ajuda a manter o projeto vivo!
          </p>
        </div>
      </div>
    </div>
  );
}
