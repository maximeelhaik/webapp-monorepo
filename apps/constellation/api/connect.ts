import { generateAiStream, getAiInstance, getModel } from "./core/server";

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

  let word = "";
  let existingWords: string[] = [];
  let seeds: string[] = [];

  try {
    const body = await req.json();
    word = body.word;
    existingWords = body.existingWords || [];
    seeds = body.seeds || [];
  } catch (e) {
    return new Response(JSON.stringify({ error: "Requête invalide" }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!word || existingWords.length === 0) {
    return new Response(JSON.stringify({ connectedTo: null }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  console.log(`[CONNECT] 🔍 Recherche lien pour: "${word}" parmi ${existingWords.length} mots.`);
  const startTimer = Date.now();

  const systemInstruction = `Tu es un expert en connectivité sémantique pour une application de carte mentale 3D. 
  Ta mission : Identifier si le mot utilisateur se connecte intelligemment à un mot déjà existant.
  
  CONTEXTE DE LA CARTE :
  Mots racines : ${seeds.join(', ')}

  RÈGLES CRITIQUES :
  1. Cherche un lien sémantique FORT (synonyme, catégorie, complémentarité, cause/effet).
  2. Exemples de liens attendus : (argent -> salaire), (avion -> voyage), (nuit -> sommeil).
  3. Si tu trouves un lien, renvoie UNIQUEMENT le mot de la liste tel quel.
  4. Si AUCUN lien n'est évident, renvoie 'null'.
  5. Réponds avec un SEUL MOT. Pas de phrase, pas de ponctuation.
  
  LISTE DES MOTS DISPONIBLES :
  ${existingWords.join(', ')}`;

  try {
    const aiInstance = getAiInstance();
    if (!aiInstance) throw new Error("AI instance not available");

    let result;
    let retries = 0;
    const maxRetries = 3; // Retry un peu pour connect.ts aussi si besoin
    
    while (retries < maxRetries) {
      try {
        result = await aiInstance.models.generateContent({
          model: getModel(),
          contents: `Mot utilisateur : "${word}"`,
          config: {
            systemInstruction,
            temperature: 0.2,
            maxOutputTokens: 500,
          }
        });
        break;
      } catch (e: any) {
        retries++;
        const is503 = e?.status === 503 || e?.statusCode === 503 ||
          (e?.message && (e.message.includes("503") || e.message.includes("high demand") || e.message.includes("UNAVAILABLE")));
        
        if (is503) {
          console.warn(`[GEMINI CONNECT 503] ⚠️ Erreur 503 détectée sur connect.ts (Essai ${retries}/${maxRetries}). Message: ${e.message || e}`);
          if (retries < maxRetries) {
            const delay = Math.pow(1.5, retries) * 150 + Math.random() * 100;
            console.log(`[GEMINI CONNECT RETRY] ⏱️ Attente agressive de ${Math.round(delay)}ms...`);
            await new Promise(r => setTimeout(r, delay));
            continue;
          }
        }
        throw e;
      }
    }

    const endTimer = Date.now();
    const geminiDuration = endTimer - startTimer;
    console.log(`[CONNECT] ⏱️ Délai IA: ${geminiDuration}ms`);

    let rawText = "";
    try {
      // Dans le nouveau SDK @google/genai, 'result' est déjà la réponse (GenerateContentResponse)
      const anyResult = result as any;
      
      if (anyResult.candidates?.[0]?.content?.parts?.[0]?.text) {
        rawText = anyResult.candidates[0].content.parts[0].text;
      } else if (typeof anyResult.text === 'function') {
        rawText = anyResult.text();
      } else if (anyResult.text) {
        rawText = anyResult.text;
      }
    } catch (e) {
      console.error("[CONNECT] Erreur extraction texte:", e);
    }

    rawText = rawText.trim().replace(/[".]/g, ""); // Nettoyage minimal
    console.log(`[CONNECT] 🤖 Réponse IA: "${rawText}"`);

    if (rawText.toLowerCase() === 'null') {
      return new Response(JSON.stringify({ connectedTo: null }), {
        status: 200,
        headers: { 
          'Content-Type': 'application/json', 
          'Access-Control-Allow-Origin': '*',
          'Server-Timing': `gemini-connect;dur=${geminiDuration};desc="Gemini Connect Call"`
        }
      });
    }

    // Normalisation pour comparaison robuste
    const normalize = (s: string) => s.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const normalizedResponse = normalize(rawText);

    const connectedTo = existingWords.find(w => normalize(w) === normalizedResponse) || null;

    if (connectedTo) {
      console.log(`[CONNECT] ✅ Lien validé: "${word}" -> "${connectedTo}"`);
    } else {
      console.log(`[CONNECT] ⚠️ Réponse hors-liste ou invalide: "${rawText}"`);
    }

    return new Response(JSON.stringify({ connectedTo }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Server-Timing': `gemini-connect;dur=${geminiDuration};desc="Gemini Connect Call"`
      }
    });
  } catch (error: any) {
    console.error(`[CONNECT ERROR]`, error);
    const endTimer = Date.now();
    const duration = endTimer - startTimer;
    return new Response(JSON.stringify({ connectedTo: null, error: error.message }), {
      status: 200, // On renvoie 200 même en cas d'erreur IA pour ne pas bloquer le flux principal
      headers: { 
        'Content-Type': 'application/json',
        'Server-Timing': `gemini-connect-failed;dur=${duration};desc="Gemini Connect Failed"`
      }
    });
  }
}
