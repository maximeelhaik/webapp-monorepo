import { generateAiStream, GEMINI_MODEL, createAiStreamResponse } from "./core/server";

export const SYSTEM_INSTRUCTION = `Tu es un générateur de vocabulaire riche et inspirant. Propose 8 mots alternatifs pour l'expression fournie (très + adjectif).
Réponds uniquement avec les 8 mots séparés par '|' sur une seule ligne. Aucun préambule, conclusion ni réflexion.
Exemple: Mot1|Mot2|Mot3|Mot4|Mot5|Mot6|Mot7|Mot8`;

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

  return await createAiStreamResponse(
    generateAiStream({
      contents: `très ${prompt}`,
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.1,
      maxOutputTokens: 120,
    })
  );
}

