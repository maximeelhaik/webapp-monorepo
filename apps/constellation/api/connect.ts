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

  let words: string[] = [];
  let existingWords: string[] = [];
  let seeds: string[] = [];

  try {
    const body = await req.json();
    words = body.words || (body.word ? [body.word] : []);
    existingWords = body.existingWords || [];
    seeds = body.seeds || [];
  } catch (e) {
    return new Response(JSON.stringify({ error: "Requête invalide" }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (words.length === 0 || existingWords.length === 0) {
    return new Response(JSON.stringify({ connections: {} }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  console.log(`[CONNECT] 🔍 Recherche lien pour ${words.length} mots parmi ${existingWords.length} mots existants.`);
  const startTimer = Date.now();

  const systemInstruction = `Tu es un expert en connectivité sémantique pour une application de cartographie mentale 3D (Constellation).
  Ta mission : Déterminer si de nouveaux mots-concepts doivent être connectés à des mots existants sur la carte pour former des régions sémantiques claires et aérées.

  CONTEXTE DE LA CARTE :
  Mots racines : ${seeds.join(', ')}

  RÈGLES DE SÉLECTIVITÉ STRICTES (POUR ÉVITER LE SÉISME ET L'ENCOMBREMENT VISUEL) :
  1. SOIS EXTRÊMEMENT SÉLECTIF : Ne crée un lien que s'il y a une relation sémantique MAJEURE, DIRECTE et INDISPENSABLE (ex: synonyme parfait, antonyme direct, ou hyperonyme/hyponyme immédiat). Renvoie "null" dans tous les autres cas (complémentarité lâche, association d'idées générale, contexte partagé). Un graphe aéré est beaucoup plus beau et lisible qu'un graphe sur-connecté.
  2. ÉVITE LES STRUCTURES "EN DIAMANT" (DIAMOND STRUCTURES) : Si un nouveau mot (ex: "Sentiment") est déjà connecté à son mot parent (ex: "Passion"), ne le connecte pas à un synonyme de ce parent (ex: "Amour") présent dans les mots existants. Ils sont déjà reliés indirectement. Les connexions redondantes ruinent la structure en régions.
  3. PAS DE TRIANGLES INUTILES : Si le nouveau mot est déjà connecté à son parent direct sur la carte, ne crée pas de lien direct avec le parent du parent (le grand-parent) ou avec les frères/sœurs du parent.

  LISTE DES MOTS EXISTANTS (CIBLES POSSIBLES) :
  ${existingWords.join(', ')}

  FORMAT DE RÉPONSE STRICT :
  Renvoie UNIQUEMENT un JSON valide au format exact suivant, sans aucun autre texte ni balises markdown :
  {
    "motNouveau1": "motExistantCible",
    "motNouveau2": "null"
  }`;

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
          contents: `Nouveaux mots à connecter : ${JSON.stringify(words)}`,
          config: {
            systemInstruction,
            temperature: 0.1,
            maxOutputTokens: 800,
            responseMimeType: "application/json"
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

    rawText = rawText.trim();
    console.log(`[CONNECT] 🤖 Réponse IA: "${rawText}"`);

    let parsedResult: Record<string, string | null> = {};
    try {
      let jsonStr = rawText;
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '');
      }
      parsedResult = JSON.parse(jsonStr.trim());
    } catch (e) {
      console.error("[CONNECT] Erreur parsing JSON:", e, rawText);
    }

    const normalize = (s: string) => s.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const finalConnections: Record<string, string | null> = {};

    for (const [newWord, target] of Object.entries(parsedResult)) {
      if (target && target.toLowerCase() !== 'null') {
         const normalizedTarget = normalize(target);
         const connectedTo = existingWords.find(w => normalize(w) === normalizedTarget) || null;
         finalConnections[newWord] = connectedTo;
         if (connectedTo) {
           console.log(`[CONNECT] ✅ Lien validé: "${newWord}" -> "${connectedTo}"`);
         }
      } else {
         finalConnections[newWord] = null;
      }
    }

    return new Response(JSON.stringify({ connections: finalConnections }), {
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
    return new Response(JSON.stringify({ connections: {}, error: error.message }), {
      status: 200, // On renvoie 200 même en cas d'erreur IA pour ne pas bloquer le flux principal
      headers: { 
        'Content-Type': 'application/json',
        'Server-Timing': `gemini-connect-failed;dur=${duration};desc="Gemini Connect Failed"`
      }
    });
  }
}
