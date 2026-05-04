import { generateAiStream, GEMINI_MODEL, createAiStreamResponse } from "./core/gemini";

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
      contents: `Traduis le mot suivant : ${prompt}`,
      systemInstruction: `Tu es un traducteur expert. Traduis le mot fourni dans 20 langues différentes (Anglais, Espagnol, Allemand, Italien, Portugais, Chinois, Japonais, Russe, Arabe, Coréen, Néerlandais, Suédois, Grec, Turc, Polonais, Hindi, Vietnamien, Thaï, Indonésien, Tchèque). Réponds uniquement avec les 20 traductions séparées par '|' sur une seule ligne. Aucun préambule, conclusion ni réflexion. Exemple: Word1|Word2|Word3|Word4|Word5|Word6|Word7|Word8|Word9|Word10|Word11|Word12|Word13|Word14|Word15|Word16|Word17|Word18|Word19|Word20`,
      temperature: 0.2,
      maxOutputTokens: 400,
    })
  );
}

