const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const APP_URL = process.env.VITE_APP_URL || 'https://ais-dev-l6kc5kepvrl7tftn4qug4j-60270630702.us-west1.run.app';
const REDIRECT_URI = `${APP_URL}/api/auth/callback`;

export default async function handler(req: any, res: any) {
  if (req.method === 'GET') {
    if (!DISCORD_CLIENT_ID) {
      return res.status(500).json({ error: 'DISCORD_CLIENT_ID não configurado nas variáveis de ambiente da Vercel.' });
    }
    const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify%20email`;
    return res.json({ url: authUrl });
  }
  res.status(405).end();
}
