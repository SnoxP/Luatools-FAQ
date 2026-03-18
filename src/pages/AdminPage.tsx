import React, { useState } from 'react';
import { useFaq } from '../context/FaqContext';
import { Save, RotateCcw, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function AdminPage() {
  const { faqData, updateFaqData, resetToDefault } = useFaq();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [jsonInput, setJsonInput] = useState(JSON.stringify(faqData, null, 2));
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Simple hardcoded password for demonstration purposes
    if (password === 'admin123') {
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Senha incorreta.');
    }
  };

  const handleSave = () => {
    try {
      setSaveStatus('saving');
      const parsedData = JSON.parse(jsonInput);
      updateFaqData(parsedData);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      console.error(err);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const handleReset = () => {
    if (window.confirm('Tem certeza que deseja restaurar o FAQ para o padrão original? Todas as alterações não salvas serão perdidas.')) {
      resetToDefault();
      setJsonInput(JSON.stringify(faqData, null, 2));
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Acesso Restrito</h2>
            <p className="text-zinc-400 text-sm">Área exclusiva para administradores do LuaTools.</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-zinc-300 mb-2">
                Senha de Administrador
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="Digite a senha..."
              />
              {error && <p className="mt-2 text-sm text-red-400 flex items-center gap-1"><AlertTriangle className="w-4 h-4" />{error}</p>}
            </div>
            <button
              type="submit"
              className="w-full bg-indigo-600 text-white font-medium rounded-xl px-4 py-3 hover:bg-indigo-500 transition-colors"
            >
              Entrar
            </button>
          </form>
          <div className="mt-6 text-center text-xs text-zinc-600">
            Dica: A senha padrão é admin123
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Gerenciador de FAQ</h1>
            <p className="text-zinc-400">Edite o conteúdo do FAQ em formato JSON. As alterações refletem imediatamente no site e no Chatbot.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors border border-zinc-700"
            >
              <RotateCcw className="w-4 h-4" />
              Restaurar Padrão
            </button>
            <button
              onClick={handleSave}
              disabled={saveStatus === 'saving'}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors ${
                saveStatus === 'success' ? 'bg-emerald-600 text-white' :
                saveStatus === 'error' ? 'bg-red-600 text-white' :
                'bg-indigo-600 text-white hover:bg-indigo-500'
              }`}
            >
              {saveStatus === 'success' ? <CheckCircle2 className="w-4 h-4" /> :
               saveStatus === 'error' ? <AlertTriangle className="w-4 h-4" /> :
               <Save className="w-4 h-4" />}
              {saveStatus === 'saving' ? 'Salvando...' :
               saveStatus === 'success' ? 'Salvo!' :
               saveStatus === 'error' ? 'Erro JSON' :
               'Salvar Alterações'}
            </button>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
          <div className="bg-zinc-950 px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
            <span className="text-sm font-mono text-zinc-400">faqData.json</span>
            <span className="text-xs text-zinc-500">Validação automática ao salvar</span>
          </div>
          <textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            className="w-full h-[600px] bg-zinc-900 text-zinc-300 font-mono text-sm p-6 focus:outline-none resize-y"
            spellCheck="false"
          />
        </div>
        
        <div className="mt-8 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-6">
          <h3 className="text-lg font-medium text-indigo-400 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Como atualizar o FAQ futuramente
          </h3>
          <ul className="list-disc list-inside text-zinc-400 space-y-2 text-sm">
            <li>O FAQ é armazenado no formato JSON (JavaScript Object Notation).</li>
            <li>Para adicionar uma nova categoria, copie um bloco de categoria existente e altere o <code>id</code>, <code>title</code> e <code>items</code>.</li>
            <li>Para adicionar uma nova pergunta, adicione um novo objeto dentro do array <code>items</code> de uma categoria, contendo <code>id</code>, <code>question</code> e <code>answer</code>.</li>
            <li>Certifique-se de usar aspas duplas <code>"</code> para chaves e valores.</li>
            <li>Se o botão ficar vermelho ao salvar, significa que há um erro de sintaxe no JSON (ex: vírgula faltando ou sobrando).</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
