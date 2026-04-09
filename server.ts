import express from 'express';
import cors from 'cors';
import axios from 'axios';
import * as admin from 'firebase-admin';
import cookieParser from 'cookie-parser';
import { createServer as createViteServer } from 'vite';
import path from 'path';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(cookieParser());
app.use(express.json());

let adminApp: admin.app.App | null = null;
try {
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
    adminApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
    console.log("Firebase Admin initialized successfully.");
  } else {
    console.warn("Firebase Admin credentials missing in .env");
  }
} catch (e) {
  console.error("Firebase Admin initialization failed:", e);
}

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const APP_URL = process.env.VITE_APP_URL || 'https://ais-dev-l6kc5kepvrl7tftn4qug4j-60270630702.us-west1.run.app';
const REDIRECT_URI = `${APP_URL}/api/auth/callback`;

// API Routes
app.get('/api/auth/discord', (req, res) => {
  if (!DISCORD_CLIENT_ID) {
    return res.status(500).send('DISCORD_CLIENT_ID não configurado no servidor.');
  }
  const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify%20email`;
  res.redirect(authUrl);
});

app.get('/api/auth/callback', async (req, res) => {
  const code = req.query.code as string;
  if (!code) return res.status(400).send('Código não fornecido');

  try {
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

    if (!adminApp) {
      return res.status(500).send('Firebase Admin não configurado. Adicione as credenciais no .env');
    }

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

    // 5. Redirect back to frontend with token
    res.redirect(`/?auth_token=${customToken}`);

  } catch (error: any) {
    console.error('OAuth Error:', error.response?.data || error.message);
    res.status(500).send('Erro na autenticação com o Discord.');
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
