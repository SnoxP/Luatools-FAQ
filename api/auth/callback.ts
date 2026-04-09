import axios from 'axios';
import * as admin from 'firebase-admin';

// Inicializa Firebase Admin de forma segura
function getFirebaseAdmin() {
  if (!admin.apps.length) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
    } catch (error) {
      console.error('Erro ao inicializar Firebase Admin:', error);
      throw new Error('Configuração do Firebase Admin inválida. Verifique as variáveis de ambiente.');
    }
  }
  return admin;
}

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const APP_URL = process.env.VITE_APP_URL || 'https://ais-dev-l6kc5kepvrl7tftn4qug4j-60270630702.us-west1.run.app';
const REDIRECT_URI = `${APP_URL}/api/auth/callback`;

export default async function handler(req: any, res: any) {
  const code = req.query.code as string;
  if (!code) return res.status(400).send('Código não fornecido');

  try {
    const adminInstance = getFirebaseAdmin();

    // 1. Exchange code for token
    const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', new URLSearchParams({
      client_id: DISCORD_CLIENT_ID!,
      client_secret: DISCORD_CLIENT_SECRET!,
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
    }).toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const accessToken = tokenResponse.data.access_token;

    // 2. Get user profile
    const userResponse = await axios.get('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const discordUser = userResponse.data;

    // 3. Create or update user in Firestore
    const db = admin.firestore();
    const userRef = db.collection('users').doc(discordUser.id);
    const userDoc = await userRef.get();

    const isMainAdmin = discordUser.id === '542832142745337867' || discordUser.email === 'pedronobreneto27@gmail.com';

    if (!userDoc.exists) {
      await userRef.set({
        email: discordUser.email || '',
        username: discordUser.username,
        discordId: discordUser.id,
        role: isMainAdmin ? 'admin' : 'user',
        isOnline: true,
        lastActive: Date.now()
      });
    } else {
      const data = userDoc.data()!;
      const updates: any = {
        username: discordUser.username,
        discordId: discordUser.id,
        isOnline: true,
        lastActive: Date.now()
      };
      if (isMainAdmin && data.role !== 'admin') updates.role = 'admin';
      await userRef.update(updates);
    }

    // 4. Mint Custom Token
    const customToken = await admin.auth().createCustomToken(discordUser.id);

    // 5. Send success message to parent window and close popup
    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', token: '${customToken}' }, '*');
              window.close();
            } else {
              window.location.href = '/?auth_token=${customToken}';
            }
          </script>
          <p>Autenticação concluída. Esta janela deve fechar automaticamente.</p>
        </body>
      </html>
    `);

  } catch (error: any) {
    console.error('OAuth Error:', error.response?.data || error.message);
    res.status(500).send('Erro na autenticação com o Discord.');
  }
}
