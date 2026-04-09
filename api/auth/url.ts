import axios from 'axios';
import * as admin from 'firebase-admin';

// Inicializa Firebase Admin apenas uma vez
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const APP_URL = process.env.VITE_APP_URL || 'https://ais-dev-l6kc5kepvrl7tftn4qug4j-60270630702.us-west1.run.app';
const REDIRECT_URI = `${APP_URL}/api/auth/callback`;

export default async function handler(req: any, res: any) {
  if (req.method === 'GET') {
    if (!DISCORD_CLIENT_ID) {
      return res.status(500).json({ error: 'DISCORD_CLIENT_ID não configurado.' });
    }
    const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify%20email`;
    return res.json({ url: authUrl });
  }
  res.status(405).end();
}
