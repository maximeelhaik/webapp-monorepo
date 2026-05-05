import { VercelRequest, VercelResponse } from '@vercel/node';

// On utilise fetch pour éviter d'imposer des SDKs lourds en Serverless.
const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

async function kvFetch(command: any[]) {
  if (!KV_URL || !KV_TOKEN) throw new Error("KV not configured");
  const response = await fetch(`${KV_URL}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${KV_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
  });
  const data = await response.json();
  return data.result;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS basic headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!KV_URL || !KV_TOKEN) {
    return res.status(200).json({ warning: "KV non configuré localement", data: [] });
  }

  const KEY = req.query.key as string || 'default-template-key';

  try {
    if (req.method === 'GET') {
      const existingData = await kvFetch(['GET', KEY]);
      const result = existingData ? JSON.parse(existingData) : [];
      return res.status(200).json({ success: true, data: result });
    }

    if (req.method === 'POST') {
      const payload = req.body;
      if (!payload) {
        return res.status(400).json({ error: "Le body est vide." });
      }

      // Lire les données existantes
      const existingData = await kvFetch(['GET', KEY]);
      let currentList = existingData ? JSON.parse(existingData) : [];

      if (!Array.isArray(currentList)) {
        currentList = [currentList];
      }

      // On ajoute l'entrée avec un timestamp
      const newEntry = {
        ...payload,
        createdAt: new Date().toISOString()
      };
      currentList.unshift(newEntry);

      // Garder les 100 dernières entrées par sécurité
      currentList = currentList.slice(0, 100);

      // On enregistre à nouveau
      await kvFetch(['SET', KEY, JSON.stringify(currentList)]);

      return res.status(200).json({ success: true, data: currentList });
    }

    return res.status(405).json({ error: "Méthode non autorisée" });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
