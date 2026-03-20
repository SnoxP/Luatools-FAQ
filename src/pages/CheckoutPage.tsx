import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { QrCode, Copy, CheckCircle2 } from 'lucide-react';

export default function CheckoutPage() {
  const [copied, setCopied] = useState(false);
  const pixKey = '11941664318';

  const handleCopy = () => {
    navigator.clipboard.writeText(pixKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">Finalizar Compra</h1>
          <p className="text-zinc-400 text-lg">Escolha a forma de pagamento para concluir seu pedido.</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-white mb-6">Pagamento via Pix</h2>
          
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1 space-y-6 w-full">
              <p className="text-zinc-300">
                Escaneie o QR Code ou copie a chave Pix abaixo para realizar o pagamento.
              </p>
              
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
                <p className="text-sm text-zinc-500 mb-2">Chave Pix (CPF)</p>
                <div className="flex items-center justify-between gap-4">
                  <code className="text-lg text-indigo-400 font-mono">{pixKey}</code>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                  >
                    {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
              </div>

              <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                <p className="text-sm text-indigo-300">
                  Após o pagamento, o acesso será liberado automaticamente em alguns minutos.
                </p>
              </div>
            </div>

            <div className="shrink-0 bg-white p-4 rounded-2xl">
              {/* Placeholder for actual QR Code image, using an icon for now or a generated QR */}
              <div className="w-48 h-48 bg-zinc-100 flex items-center justify-center rounded-xl border-2 border-dashed border-zinc-300">
                <QrCode className="w-24 h-24 text-zinc-400" />
              </div>
              <p className="text-center text-zinc-500 text-sm mt-4 font-medium">QR Code Pix</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
