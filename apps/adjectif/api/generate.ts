import { generateAiStream, GEMINI_MODEL, SYSTEM_INSTRUCTION, createAiStreamResponse } from "./core/gemini";

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: "Méthode non autorisée" }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  let prompt = "";
  try {
    const body = await req.json();
    prompt = body.prompt;
  } catch (e) {
    return new Response(JSON.stringify({ error: "Requête invalide" }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!prompt) {
    return new Response(JSON.stringify({ error: "Le champ 'prompt' est manquant." }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return createAiStreamResponse(
    generateAiStream({
      contents: `très ${prompt}`,
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.1,
      maxOutputTokens: 120,
    })
  );
}

