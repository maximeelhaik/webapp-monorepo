import { generateAiStream, createAiStreamResponse, handleWarmup } from "./core/server";

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  const warmupResponse = await handleWarmup(req);
  if (warmupResponse) return warmupResponse;

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

  const cleanPrompt = prompt.trim().toLowerCase();
  const systemInstruction = `Tu es un explorateur de l'imaginaire et un cartographe des associations d'idées.
  Pour le mot donné, trouve des mots uniques qui ouvrent des chemins de pensée variés.
  
  CONSIGNES STRICTES :
  1. NE REPRENDS JAMAIS le mot lui-même.
  2. Propose des mots UNIQUEMENT en minuscules, séparés par le symbole '|'.
  3. CONSIDERE le champ lexical, l'imaginaire collectif, les références culturelles et les glissements sémantiques.
  4. Pas de doublons, pas de chiffres, pas d'introduction. Commence DIRECTEMENT par le premier mot.`;

  try {
    return await createAiStreamResponse(
      generateAiStream({
        contents: `Génère les 6 mots associés au mot : ${cleanPrompt}`,
        systemInstruction,
        temperature: 0.85,
        maxOutputTokens: 1000, // Largement suffisant pour 5 mots, réduit la latence
      })
    );
  } catch (error: any) {
    return new Response(JSON.stringify({
      error: "L'IA est actuellement surchargée. Veuillez réessayer dans quelques instants.",
      details: error.message
    }), {
      status: error.status || 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
