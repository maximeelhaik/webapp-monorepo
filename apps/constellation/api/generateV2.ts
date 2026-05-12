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
  let sector = "";
  let temperature: number | undefined;
  let maxOutputTokens: number | undefined;

  try {
    const body = await req.json();
    prompt = body.prompt;
    if (body.mode) mode = body.mode;
    if (body.target) target = body.target;
    if (body.exclude && Array.isArray(body.exclude)) exclude = body.exclude;
    if (body.conceptsCount) conceptsCount = body.conceptsCount;
    if (body.brandablesCount) brandablesCount = body.brandablesCount;
    if (body.sector) sector = body.sector;
    if (body.temperature !== undefined) temperature = body.temperature;
    if (body.maxOutputTokens !== undefined) maxOutputTokens = body.maxOutputTokens;
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

  // Instruction Contextuelle Temporelle
  const temporalContext = `\nCONTEXTE : Nous sommes en 2026.`;
  const sectorContext = sector ? ` Secteur cible : ${sector}.` : '';
  
  const finalContext = temporalContext + sectorContext + "\n";

  let namingInstruction = `Tu es un expert en naming stratégique et linguistique créative.\nPour le concept central "${cleanPrompt}", génère ce qui est demandé.\n${finalContext}\n`;
  let formatInstruction = `FORMAT DE RÉPONSE STRICT (sans introduction, sans commentaire, sans numérotation) :\n`;

  const conceptsPrompt = `  - Exactement ${conceptsCount} CONCEPTS connexes qui serviront de terrain d'inspiration et de navigation - trouve des mots uniques qui ouvrent des chemins de pensée variés.
  RÈGLES STRICTES POUR LES CONCEPTS :
  1. Doivent être de vrais mots compréhensibles (en français) qui définissent une idée, une fonction, une métaphore lié au mot "${cleanPrompt}". 
  2. Doivent permettre à l'utilisateur de naviguer sémantiquement de proche en proche. 
  3. ÉVITE les synonymes directs de "${cleanPrompt}".
  4. En minuscules, séparés par le symbole '|'.`;

  const brandablesPrompt = `  - Exactement ${brandablesCount} BRANDABLES : Noms de marque crédibles${sector ? ` pour le secteur ${sector}` : ''}.
  RÈGLES STRICTES POUR LES BRANDABLES :
  Utilise les TECHNIQUES DE NAMING suivantes de manière créative et diversifiée, assure-toi d'utiliser au moins 4 techniques différentes dans ta liste :
  - Traduction du mot "${cleanPrompt}" dans d'autres langues : japonais, basque, finnois, grec, islandais, malgache, sanskrit, etc.
  - Portmanteau : Fusion de deux mots 
  - Troncation : Raccourcissement créatif 
  - Expression française rare et percutante
 

  CRITÈRES DE QUALITÉ OBLIGATOIRES :
  1. Longueur : mot de 3 à 15 lettres, ou expression de 2 à 4 mots
  2. Non-générique : Refuse absolument les noms évidents. Évite les mots anglais / français courants trop courts déjà largement utilisés.

  
  Pour chaque BRANDABLE, fournir une DESCRIPTION NEUTRE et FONCTIONNELLE :
  - Signification et origine du mot en une phrase.
  - Format : Majuscule au début de phrase, accents acceptés, pas de virgules ou de point final.
  - Rester factuel, sans métaphore ni lyrisme.`;

  const generateFormatString = (prefix: string, count: number, hasDesc: boolean) => {
    return Array.from({ length: count }).map((_, i) => hasDesc ? `${prefix}${i + 1}: description${i + 1}` : `${prefix}${i + 1}`).join('|');
  };

  const conceptsFormat = generateFormatString('concept', conceptsCount, false);
  const brandablesFormat = generateFormatString('brandable', brandablesCount, true);

  if (target === 'both') {
    namingInstruction += `Étape 1 : Génère les concepts connexes.\nÉtape 2 : Génère les noms brandables. Le mot central "${cleanPrompt}" DOIT RESTER LE COEUR ABSOLU de l'inspiration.\n\n` + conceptsPrompt + "\n\n" + brandablesPrompt;
    formatInstruction += conceptsFormat + "\n===\n" + brandablesFormat;
  } else if (target === 'concepts') {
    namingInstruction += conceptsPrompt;
    formatInstruction += conceptsFormat;
  } else if (target === 'brandables') {
    namingInstruction += brandablesPrompt;
    formatInstruction += brandablesFormat;
  }

  // Suppression de l'exclusion dans le prompt pour alléger la requête et réduire la latence.
  // La vérification et le filtrage se font déjà en aval (côté client).

  const systemInstruction = isNamingMode
    /* ===================== MODE NAMING ===================== */
    ? `${namingInstruction}\n${formatInstruction}`

    /*. ===================== MODE EXPLORER ===================== */
    : `Tu es un explorateur de l'imaginaire et un cartographe des associations d'idées.
  Pour le mot donné, trouve des mots uniques qui ouvrent des chemins de pensée variés.
  CONSIGNES STRICTES :
  1. NE REPRENDS JAMAIS le mot lui-même.
  2. Propose des mots UNIQUEMENT en minuscules, séparés par le symbole '|'.
  3. CONSIDERE le champ lexical, l'imaginaire collectif, les références culturelles et les glissements sémantiques.
  4. Pas de doublons, pas de chiffres, pas d'introduction. Commence DIRECTEMENT par le premier mot.`;

  const contents = isNamingMode
    ? `Génère la réponse formatée pour le mot : ${cleanPrompt}`
    : `Génère les 6 mots associés au mot : ${cleanPrompt}`;

  // Configuration dynamique des paramètres d'IA
  let finalTemperature = temperature;
  let finalMaxTokens = maxOutputTokens;

  if (!isNamingMode) {
    if (finalTemperature === undefined) finalTemperature = 0.7;
    if (finalMaxTokens === undefined) finalMaxTokens = 400;
  } else {
    if (target === 'concepts') {
      if (finalTemperature === undefined) finalTemperature = 0.6; // Plus factuel et sémantiquement proche
      if (finalMaxTokens === undefined) finalMaxTokens = 400; // Uniquement des mots
    } else if (target === 'brandables') {
      if (finalTemperature === undefined) finalTemperature = 0.95; // Créativité maximale pour les néologismes
      if (finalMaxTokens === undefined) finalMaxTokens = 1000; // Besoin de place pour les descriptions
    } else {
      if (finalTemperature === undefined) finalTemperature = 0.85; // Équilibre entre concept et création
      if (finalMaxTokens === undefined) finalMaxTokens = 1400; // Les deux listes combinées
    }
  }

  try {
    return await createAiStreamResponse(
      generateAiStream({
        contents,
        systemInstruction,
        temperature: finalTemperature,
        maxOutputTokens: finalMaxTokens,
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
