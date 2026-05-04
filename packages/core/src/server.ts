import { GoogleGenAI } from "@google/genai";

export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';

let cachedAiInstance: GoogleGenAI | null = null;

export function getAiInstance() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!cachedAiInstance) {
    cachedAiInstance = new GoogleGenAI({ apiKey });
  }
  return cachedAiInstance;
}

export async function generateAiStream({
  contents,
  systemInstruction,
  temperature = 0.1,
  maxOutputTokens = 120,
}: {
  contents: string;
  systemInstruction: string;
  temperature?: number;
  maxOutputTokens?: number;
}) {
  const aiInstance = getAiInstance();
  if (!aiInstance) {
    throw new Error("Clé API Gemini manquante.");
  }
  let response;
  let retries = 0;
  const maxRetries = 2;

  while (retries < maxRetries) {
    try {
      response = await aiInstance.models.generateContentStream({
        model: GEMINI_MODEL,
        contents,
        config: {
          systemInstruction,
          temperature,
          maxOutputTokens,
        }
      });
      break;
    } catch (e: any) {
      retries++;
      const is503 = e?.status === 503 || e?.statusCode === 503 || (e?.message && e.message.includes("503"));
      if (is503 && retries < maxRetries) {
        await new Promise(r => setTimeout(r, 800));
        continue;
      }
      throw e;
    }
  }

  if (!response) {
    throw new Error("Impossible d'initialiser la réponse AI.");
  }
  return response;
}

export function createKvDbHandler(defaultKey: string) {
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

  return async function handler(req: any, res: any) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    if (!KV_URL || !KV_TOKEN) {
      console.warn("[TEMPLATE BACK] Variables d'environnement KV manquantes.");
      return res.status(200).json({ warning: "KV non configuré localement", data: [] });
    }

    const KEY = req.query.key || defaultKey;

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

        const existingData = await kvFetch(['GET', KEY]);
        let currentList = existingData ? JSON.parse(existingData) : [];

        if (!Array.isArray(currentList)) {
          currentList = [currentList];
        }

        const newEntry = {
          ...payload,
          createdAt: new Date().toISOString()
        };
        currentList.unshift(newEntry);
        currentList = currentList.slice(0, 100);

        await kvFetch(['SET', KEY, JSON.stringify(currentList)]);

        return res.status(200).json({ success: true, data: currentList });
      }

      return res.status(405).json({ error: "Méthode non autorisée" });
    } catch (error: any) {
      console.error("[TEMPLATE BACK] Erreur BDD:", error);
      return res.status(500).json({ error: error.message });
    }
  };
}

export async function createAiStreamResponse(responseStreamPromise: Promise<any>) {
  const response = await responseStreamPromise;
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        for await (const chunk of response) {
          if (chunk.text) {
            controller.enqueue(encoder.encode(chunk.text));
          }
        }
      } catch (error: any) {
        console.error("[SERVER STREAM] Error in iterator:", error);
        controller.enqueue(encoder.encode(`---ERROR---${error.message || "Erreur AI"}`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Content-Type-Options': 'nosniff',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': '*',
      'X-Model-Used': GEMINI_MODEL,
    },
  });
}
