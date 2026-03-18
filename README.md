# LuaTools - Central de Suporte

Bem-vindo ao repositório do site oficial de suporte do **LuaTools**. Este projeto foi desenvolvido para ajudar usuários com dúvidas através de um sistema de FAQ organizado e um Chatbot com IA integrado.

## 🚀 Funcionalidades

- **Design Moderno:** Tema escuro (Dark Mode) com interface focada em usabilidade e estilo gamer/tech.
- **FAQ Organizado:** Base de conhecimento dividida por categorias (Instalação, Soluções de problemas, Erros específicos).
- **Busca Inteligente:** Barra de pesquisa com destaque de palavras-chave.
- **Chatbot com IA:** Assistente virtual treinado **exclusivamente** com o FAQ do LuaTools, garantindo respostas precisas e sem inventar informações.
- **Painel Admin:** Página dedicada para administradores editarem o FAQ em tempo real.
- **Responsividade:** Funciona perfeitamente em dispositivos móveis e desktops.

## 🛠️ Tecnologias Utilizadas

- **React 19** (Vite)
- **Tailwind CSS v4** (Estilização)
- **Framer Motion** (Animações)
- **Lucide React** (Ícones)
- **Google Gemini API** (Chatbot IA)
- **React Router DOM** (Navegação)

## 📦 Como Rodar Localmente

1. **Clone o repositório** (ou baixe os arquivos).
2. **Instale as dependências:**
   \`\`\`bash
   npm install
   \`\`\`
3. **Configure a variável de ambiente:**
   Crie um arquivo \`.env\` na raiz do projeto e adicione sua chave de API do Gemini:
   \`\`\`env
   VITE_GEMINI_API_KEY=sua_chave_aqui
   \`\`\`
   *(Nota: No ambiente do AI Studio, a chave \`GEMINI_API_KEY\` já é injetada automaticamente).*
4. **Inicie o servidor de desenvolvimento:**
   \`\`\`bash
   npm run dev
   \`\`\`
5. Acesse \`http://localhost:3000\` no seu navegador.

## 🌐 Instruções de Deploy (Vercel ou Netlify)

O projeto está pronto para ser hospedado gratuitamente na Vercel ou Netlify.

### Deploy na Vercel (Recomendado)
1. Crie uma conta no [Vercel](https://vercel.com/).
2. Conecte seu repositório do GitHub.
3. Importe o projeto.
4. Na seção **Environment Variables**, adicione:
   - Name: \`VITE_GEMINI_API_KEY\`
   - Value: \`[sua_chave_da_api_do_google_gemini]\`
5. Clique em **Deploy**.

### Deploy na Netlify
1. Crie uma conta no [Netlify](https://netlify.com/).
2. Clique em "Add new site" > "Import an existing project".
3. Conecte seu GitHub e selecione o repositório.
4. Adicione a variável de ambiente \`VITE_GEMINI_API_KEY\` nas configurações avançadas.
5. Clique em **Deploy site**.

## 📝 Como Atualizar o FAQ Futuramente

O site possui um painel administrativo embutido para facilitar a atualização do FAQ sem precisar mexer no código-fonte.

1. Acesse a página \`/admin\` no site.
2. Faça login com a senha padrão: \`admin123\` *(Você pode alterar essa senha no arquivo \`src/pages/AdminPage.tsx\`)*.
3. O FAQ é exibido em formato **JSON**.
4. **Para adicionar uma nova pergunta:**
   Encontre a categoria desejada e adicione um novo bloco dentro do array \`items\`:
   \`\`\`json
   {
     "id": "12A",
     "question": "Sua nova pergunta aqui?",
     "answer": "Sua resposta aqui."
   }
   \`\`\`
5. Clique em **Salvar Alterações**. As mudanças refletirão imediatamente na página de FAQ e no conhecimento do Chatbot.

> **Nota sobre persistência:** Atualmente, as alterações feitas no painel Admin são salvas no \`localStorage\` do navegador. Para uma solução definitiva em produção, recomenda-se copiar o JSON atualizado do painel Admin e colar no arquivo \`src/data/defaultFaq.ts\`, e então fazer um novo commit/deploy. Alternativamente, você pode conectar o \`FaqContext.tsx\` a um banco de dados real como Firebase ou Supabase.
