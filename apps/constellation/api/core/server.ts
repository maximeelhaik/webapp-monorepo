import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";

export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
export const getModel = () => process.env.GEMINI_MODEL || GEMINI_MODEL || 'gemini-2.5-flash-lite';

let cachedAiInstance: GoogleGenAI | null = null;

export function getAiInstance() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!cachedAiInstance) {
    cachedAiInstance = new GoogleGenAI({ apiKey });
  }
  return cachedAiInstance;
}

export async function handleWarmup(req: Request) {
  try {
    const cloned = req.clone();
    const body = await cloned.json();
    if (body && body.prompt === "ping") {
      const aiInstance = getAiInstance();
      if (aiInstance) {
        await aiInstance.models.generateContent({
          model: getModel(),
          contents: "p",
          config: { maxOutputTokens: 1 }
        }).catch(() => { });
      }
      return new Response(JSON.stringify({ status: "warmed" }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
  } catch (e) { }
  return null;
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
  const maxRetries = 6;

  while (retries < maxRetries) {
    try {
      const modelName = getModel();

      response = await aiInstance.models.generateContentStream({
        model: modelName,
        contents,
        config: {
          systemInstruction,
          temperature,
          maxOutputTokens,
          // Réduire les filtres de sécurité peut parfois aider à éviter des délais/surcharges inutiles
          // pour des tâches sémantiques simples comme celle-ci.
          safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          ]
        }
      });
      break;
    } catch (e: any) {
      retries++;
      const is503 = e?.status === 503 || e?.statusCode === 503 ||
        (e?.message && (e.message.includes("503") || e.message.includes("high demand") || e.message.includes("UNAVAILABLE")));

      if (is503) {
        console.warn(`[GEMINI 503] ⚠️ Erreur 503/High Demand détectée (Essai ${retries}/${maxRetries}). Message: ${e.message || e}`);
        if (retries < maxRetries) {
          // Solution A (plus agressive) : délais réduits (ex: 150ms, 225ms, 337ms...) pour UX fluide
          const delay = Math.pow(1.5, retries) * 150 + Math.random() * 100;
          console.log(`[GEMINI RETRY] ⏱️ Attente agressive de ${Math.round(delay)}ms avant le prochain essai...`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
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
      return res.status(500).json({ error: error.message });
    }
  };
}

export async function createAiStreamResponse(responseStreamPromise: Promise<any>) {
  const startTime = Date.now();
  let response;
  try {
    response = await responseStreamPromise;
  } catch (err: any) {
    console.error("[STREAM RESPONSE ERROR]", err);
    return new Response(JSON.stringify({ error: err.message || "Erreur AI" }), {
      status: err.status || 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  }
  const connectDuration = Date.now() - startTime;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        let chunkCount = 0;

        for await (const chunk of response) {
          chunkCount++;
          let text = "";
          try {
            // Dans le nouveau SDK @google/genai, chunk.text est souvent une propriété directe
            // ou une méthode selon la structure.
            text = (typeof chunk.text === 'function') ? chunk.text() : (chunk.text || "");

            // Si toujours vide, on fouille dans les candidats
            if (!text && chunk.candidates?.[0]?.content?.parts?.[0]?.text) {
              text = chunk.candidates[0].content.parts[0].text;
            }
          } catch (e) {
          }

          if (text) {
            controller.enqueue(encoder.encode(text));
          }
        }
      } catch (error: any) {
        console.error("[STREAM CHUNK ERROR]", error);
        controller.enqueue(encoder.encode(`---ERROR---${error.message || "Erreur AI"}`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'X-Content-Type-Options': 'nosniff',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': '*',
      'X-Model-Used': getModel(),
      'Server-Timing': `gemini-connect;dur=${connectDuration};desc="Gemini Stream Connection"`,
    },
  });
}
