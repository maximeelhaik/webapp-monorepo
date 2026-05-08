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
  let mode = "classic";
  let target: "concepts" | "brandables" | "both" = "both";
  let exclude: string[] = [];
  let conceptsCount = 5;
  let brandablesCount = 5;
  try {
    const body = await req.json();
    prompt = body.prompt;
    if (body.mode) {
      mode = body.mode;
    }
    if (body.target) {
      target = body.target;
    }
    if (body.exclude && Array.isArray(body.exclude)) {
      exclude = body.exclude;
    }
    if (body.conceptsCount) conceptsCount = body.conceptsCount;
    if (body.brandablesCount) brandablesCount = body.brandablesCount;
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
  const isNamingMode = mode === "naming";

  let namingInstruction = `Tu es un expert en naming de marque stratégique, spécialisé en phonétique et brandabilité.\nPour le mot ${cleanPrompt} donné, génère :\n\n`;
  let formatInstruction = `FORMAT DE RÉPONSE STRICT (sans introduction, sans commentaire, sans numérotation) :\n`;

  const conceptsPrompt = `  - Exactement ${conceptsCount} CONCEPTS CONNEXES au mot donné, soumis aux critères stricts suivants
  — Ont un sens conceptuel, métaphorique ou suggestif lié au mot donné. Ces mots permettent d'ouvrir des chemins de pensée variés.
  - Vrais mots du dictionnaire français ou anglosaxon 
  - Donnés en minuscules, séparés par le symbole '|'.`;

  const brandablesPrompt = `  - Exactement ${brandablesCount} BRANDABLES - mots ou expressions liés au mot soumis et fortement utilisable en tant que nom de marque 
    - 1 à 3 syllabes de préférence. Phonétiquement fluide à l'oral, facile à prononcer et à épeler
     - Mot dans n'importe quelle langue. Pas de mot trop commun ou courants en français. Noms propres acceptés.
     - Peut être une traduction, un dérivé, une expression contenant ${cleanPrompt}
     - Donnés en minuscules
     
  - Pour chaque NOMS BRANDABLE, fournir une DESCRIPTION NEUTRE et FONCTIONNELLE :
     - Indiquer : La signification du mot en une phrase courte (5 à 10 mots)
     - Majuscule au début de description, accents acceptés. Pas de virgules ou de point.
     - Rester factuel, court, sans métaphore ni lyrisme`;

  const generateFormatString = (prefix: string, count: number, hasDesc: boolean) => {
    return Array.from({ length: count }).map((_, i) => hasDesc ? `${prefix}${i + 1}: description${i + 1}` : `${prefix}${i + 1}`).join('|');
  };

  const conceptsFormat = generateFormatString('concept', conceptsCount, false);
  const brandablesFormat = generateFormatString('brandable', brandablesCount, true);

  if (target === 'both') {
    namingInstruction += conceptsPrompt + "\n\n" + brandablesPrompt;
    formatInstruction += conceptsFormat + "\n===\n" + brandablesFormat;
  } else if (target === 'concepts') {
    namingInstruction += conceptsPrompt;
    formatInstruction += conceptsFormat;
  } else if (target === 'brandables') {
    namingInstruction += brandablesPrompt;
    formatInstruction += brandablesFormat;
  }

  let exclusionInstruction = "";
  if (exclude.length > 0) {
    exclusionInstruction = `\nNE PROPOSE SOUS AUCUN PRÉTEXTE LES MOTS SUIVANTS (ils ont déjà été trouvés) :\n${exclude.join(', ')}\n`;
  }

  const systemInstruction = isNamingMode
    /* ===================== MODE NAMING ===================== */
    ? `${namingInstruction}${exclusionInstruction}\n\n${formatInstruction}`

    /*. ===================== MODE EXPLORER ===================== */
    : `Tu es un explorateur de l'imaginaire et un cartographe des associations d'idées.
  Pour le mot donné, trouve des mots uniques qui ouvrent des chemins de pensée variés.
  ${exclusionInstruction}
  CONSIGNES STRICTES :
  1. NE REPRENDS JAMAIS le mot lui-même.
  2. Propose des mots UNIQUEMENT en minuscules, séparés par le symbole '|'.
  3. CONSIDERE le champ lexical, l'imaginaire collectif, les références culturelles et les glissements sémantiques.
  4. Pas de doublons, pas de chiffres, pas d'introduction. Commence DIRECTEMENT par le premier mot.`;

  const contents = isNamingMode
    ? `Génère la réponse formatée pour le mot : ${cleanPrompt}`
    : `Génère les 6 mots associés au mot : ${cleanPrompt}`;

  try {
    return await createAiStreamResponse(
      generateAiStream({
        contents,
        systemInstruction,
        temperature: 0.9,
        maxOutputTokens: 1000, // Limite à 500 tokens pour réduire la latence et les coûts
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
