import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion';
import Constellation3DV2 from './components/Constellation3DV2';
import { ACTIVE_THEME, THEMES } from './theme';

// Boot sequence lines
const BOOT_LINES = [
  { cls: 'boot-line boot-line-1', text: 'CONNEXE OS v2.6' },
  { cls: 'boot-line boot-line-2', text: 'LOADING SEMANTIC ENGINE...' },
  { cls: 'boot-line boot-line-3', text: 'MAPPING SYSTEM: READY' },
  { cls: 'boot-line boot-line-4', text: '▶ ENTER' },
];


// --- ENGINES FOR STRICT RENDER FONT AUDITING ---
const isFontActive = (fontName: string, fallback: 'serif' | 'sans-serif' | 'monospace' = 'monospace'): boolean => {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;

    const text = 'abcdefghijklmnopqrstuvwxyz0123456789';
    ctx.font = `72px ${fallback}`;
    const fallbackWidth = ctx.measureText(text).width;

    ctx.font = `72px "${fontName}", ${fallback}`;
    const testWidth = ctx.measureText(text).width;

    return testWidth !== fallbackWidth;
  } catch (e) {
    return false;
  }
};

const detectActuallyRenderedFont = (element: HTMLElement | null): string => {
  if (!element) return 'Non détecté (élément introuvable)';

  const computedFamily = window.getComputedStyle(element).fontFamily;
  const declaredFonts = computedFamily
    .split(',')
    .map(f => f.trim().replace(/['"]/g, ''));

  for (const font of declaredFonts) {
    if (['sans-serif', 'serif', 'monospace', 'cursive', 'fantasy', 'system-ui'].includes(font)) {
      return font;
    }

    const fallbackType = declaredFonts.includes('monospace') ? 'monospace' : 'sans-serif';
    if (isFontActive(font, fallbackType)) {
      return font;
    }
  }

  return declaredFonts[declaredFonts.length - 1] || 'sans-serif';
};

const logRenderedFonts = () => {
  const titleEl = document.querySelector('.app-title') as HTMLElement;
  const subtitleEl = document.querySelector('.app-subtitle') as HTMLElement;
  const detailEl = document.querySelector('.app-details') as HTMLElement;
  const labelEl = document.querySelector('.graph-label') as HTMLElement;
  const themeBtnEl = document.querySelector('.app-theme-button') as HTMLElement;

  const titleFont = detectActuallyRenderedFont(titleEl);
  const subtitleFont = detectActuallyRenderedFont(subtitleEl);
  const detailFont = detectActuallyRenderedFont(detailEl);
  const labelFont = detectActuallyRenderedFont(labelEl);
  const themeBtnFont = detectActuallyRenderedFont(themeBtnEl);

  console.log(
    `%c┌────────────────────────────────────────────────────────┐\n` +
    `│ 🕵️  FONT DIAGNOSTIC (STRICT RENDER AUDIT)              │\n` +
    `├────────────────────────────────────────────────────────┤\n` +
    `│  • TITRE (Lexical)      : %c${titleFont.padEnd(28)}%c │\n` +
    `│  • ÉTIQUETTES (3D)      : %c${labelFont.padEnd(28)}%c │\n` +
    `│  • SOUS-TITRE (S.M.S)   : %c${subtitleFont.padEnd(28)}%c │\n` +
    `│  • ÉLÉMENTS SECONDAIRES : %c${detailFont.padEnd(28)}%c │\n` +
    `└────────────────────────────────────────────────────────┘`,
    'color: #E5C158; font-weight: bold;',
    'color: #00ffcc; font-weight: bold;', 'color: #E5C158;',
    'color: #00ffcc; font-weight: bold;', 'color: #E5C158;',
    'color: #94a3b8; font-weight: bold;', 'color: #E5C158;',
    'color: #94a3b8; font-weight: bold;', 'color: #E5C158;'
  );
};


const LANGUAGES = {
  fr: {
    subtitle: "Cartographie des relations sémantiques.",
    placeholderInit: "Entrez un mot",
    placeholderSearch: "Rechercher",
    btnExplore: "Explorer",
    btnLoading: "Chargement...",
    loadingTitle: "Calcul des connexions...",
    loadingSubtitle: "Analyse en cours",
    suggestions: ["entropie", "mémoire", "lumière", "système", "origine"],
    themeAmber: "Ambre",
    themeLight: "Clair",
    themeRawMinimal: "Minimal",
    labelsControl: "Étiquettes",
    labelsAuto: "Auto",
    labelsVisible: "Visible",
    statusLoading: "Chargement",
    statusLoaded: "Prêt",
    statusNodes: "Concepts",
    statusDepth: "Profondeur",
    errDefault: "Une erreur est survenue. Veuillez réessayer."
  },
  en: {
    subtitle: "A 3D map of semantic relationships.",
    placeholderInit: "Explore a concept",
    placeholderSearch: "Search",
    btnExplore: "Explore",
    btnLoading: "Loading...",
    loadingTitle: "Building graph...",
    loadingSubtitle: "Fetching relations...",
    suggestions: ["entropy", "memory", "light", "system", "origin"],
    themeAmber: "Dark",
    themeLight: "Light",
    themeRawMinimal: "Minimal",
    labelsControl: "Labels",
    labelsAuto: "Auto",
    labelsVisible: "Visible",
    statusLoading: "Loading",
    statusLoaded: "Ready",
    statusNodes: "Nodes",
    statusDepth: "Depth",
    errDefault: "Something went wrong. Try again."
  }
};


export default function App() {


  // --- NOUVELLE IMPLEMENTATION DYNAMIQUE ---
  const [centerWord, setCenterWord] = useState('');
  const [relatedWords, setRelatedWords] = useState<string[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingConnexes, setLoadingConnexes] = useState(false);
  const [loadingSatellites, setLoadingSatellites] = useState(false);
  const [inputWord, setInputWord] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [allNodesOnMap, setAllNodesOnMap] = useState<string[]>([]);
  const [parentsMap, setParentsMap] = useState<Record<string, string>>({});
  const [edges, setEdges] = useState<Set<string>>(new Set());
  const [seeds, setSeeds] = useState<string[]>([]);
  const [forceConnectTo, setForceConnectTo] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastFetchedWordRef = useRef<string | null>(null);
  const [exploredCache, setExploredCache] = useState<Record<string, string[]>>({});
  const [satelliteBrandables, setSatelliteBrandables] = useState<Record<string, { name: string; desc: string }[]>>({});
  const [satelliteReserve, setSatelliteReserve] = useState<Record<string, { name: string; desc: string }[]>>({});
  const [initialized, setInitialized] = useState(false);
  const [labelsOpaque, setLabelsOpaque] = useState(true); // Par défaut en mode étiquette visible
  const [showSatellites, setShowSatellites] = useState(true);
  const [userPreferredShowSatellites, setUserPreferredShowSatellites] = useState(true);
  const [lang, setLang] = useState<'fr' | 'en'>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('app-lang');
      if (stored === 'fr' || stored === 'en') return stored;
      const browserLang = navigator.language.slice(0, 2);
      if (browserLang === 'fr' || browserLang === 'en') return browserLang as 'fr' | 'en';
    }
    return 'fr';
  });

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const useNaming = true;

  useEffect(() => {
    localStorage.setItem('app-lang', lang);
  }, [lang]);

  const t = LANGUAGES[lang];


  // Boot + UI states
  const [bootComplete, setBootComplete] = useState(true);
  const [amberFlash, setAmberFlash] = useState(false);
  const [activeTheme, setActiveTheme] = useState(ACTIVE_THEME);

  // Custom magnetic cursor
  const cursorX = useMotionValue(0);
  const cursorY = useMotionValue(0);
  const [cursorType, setCursorType] = useState<'default' | 'pointer' | 'text'>('default');
  const cursorTypeRef = useRef<'default' | 'pointer' | 'text'>('default');

  // Amber cursor trail (3 spring-lagged dots)
  const trail1X = useSpring(cursorX, { damping: 18, stiffness: 180 });
  const trail1Y = useSpring(cursorY, { damping: 18, stiffness: 180 });
  const trail2X = useSpring(cursorX, { damping: 10, stiffness: 90 });
  const trail2Y = useSpring(cursorY, { damping: 10, stiffness: 90 });
  const trail3X = useSpring(cursorX, { damping: 6, stiffness: 50 });
  const trail3Y = useSpring(cursorY, { damping: 6, stiffness: 50 });

  const isFinePointer = typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches;


  // Update magnetic cursor
  useEffect(() => {
    if (!isFinePointer) return;

    const mouseMove = (e: MouseEvent) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);

      const target = e.target as HTMLElement;
      let newType: 'default' | 'pointer' | 'text' = 'default';

      if (target) {
        const inputEl = target.tagName === 'INPUT' ? (target as HTMLInputElement) : target.closest('input');
        if (inputEl) {
          if (inputEl.type === 'range') {
            newType = 'pointer';
          } else {
            newType = 'text';
          }
        } else if (
          target.tagName === 'BUTTON' ||
          target.closest('button') ||
          target.closest('.cursor-pointer') ||
          target.hasAttribute('onClick')
        ) {
          newType = 'pointer';
        }
      }

      if (newType !== cursorTypeRef.current) {
        cursorTypeRef.current = newType;
        setCursorType(newType);
      }
    };

    window.addEventListener('mousemove', mouseMove);
    return () => window.removeEventListener('mousemove', mouseMove);
  }, [isFinePointer]);

  // Boot sequence — one-shot 1.8s
  useEffect(() => {
    const t = setTimeout(() => setBootComplete(true), 1800);
    return () => clearTimeout(t);
  }, []);

  // Amber flash when active word changes
  useEffect(() => {
    setAmberFlash(true);
    const t = setTimeout(() => setAmberFlash(false), 500);
    return () => clearTimeout(t);
  }, [centerWord]);

  const loggedFontsOnceRef = useRef(false);

  // Strict font auditing logger — runs once when the main interface opens
  useEffect(() => {
    (window as any).auditFonts = logRenderedFonts;

    if (initialized && !loggedFontsOnceRef.current) {
      const timer = setTimeout(() => {
        logRenderedFonts();
        loggedFontsOnceRef.current = true;
      }, 1200); // Allow time for all DOM elements to render
      return () => clearTimeout(timer);
    }
  }, [initialized]);





  // --- NOUVELLE IMPLEMENTATION ---
  const [casingMap, setCasingMap] = useState<Record<string, string>>({});



  // --- NOUVELLE IMPLEMENTATION DYNAMIQUE ---
  const getShortestPath = useCallback((targetWord: string) => {
    const target = targetWord.toLowerCase();

    // Construire l'adjacence depuis tous les liens connus
    const adj = new Map<string, string[]>();
    edges.forEach(link => {
      const [a, b] = link.split('|');
      if (!adj.has(a)) adj.set(a, []);
      if (!adj.has(b)) adj.set(b, []);
      adj.get(a)!.push(b);
      adj.get(b)!.push(a);
    });

    // BFS pour trouver le chemin le plus court vers la première seed (la racine absolue)
    const rootSeed = seeds[0] ? seeds[0].toLowerCase() : target;
    const queue: [string, string[]][] = [[rootSeed, [rootSeed]]];
    const visited = new Set<string>([rootSeed]);

    while (queue.length > 0) {
      const [curr, path] = queue.shift()!;
      if (curr === target) return path.map(w => casingMap[w] || w);

      const neighbors = adj.get(curr) || [];
      for (const nb of neighbors) {
        if (!visited.has(nb)) {
          visited.add(nb);
          queue.push([nb, [...path, nb]]);
        }
      }
    }

    // Si non trouvé (cluster déconnecté), on cherche depuis les autres seeds pour garder une cohérence locale
    // mais on privilégie toujours le chemin le plus court trouvé.
    for (const seed of seeds) {
      const sLower = seed.toLowerCase();
      if (sLower === rootSeed) continue;

      const sQueue: [string, string[]][] = [[sLower, [sLower]]];
      const sVisited = new Set<string>([sLower]);

      while (sQueue.length > 0) {
        const [curr, path] = sQueue.shift()!;
        if (curr === target) return path.map(w => casingMap[w] || w);

        const neighbors = adj.get(curr) || [];
        for (const nb of neighbors) {
          if (!sVisited.has(nb)) {
            sVisited.add(nb);
            sQueue.push([nb, [...path, nb]]);
          }
        }
      }
    }

    return [casingMap[target] || targetWord]; // Fallback si vraiment aucun lien
  }, [edges, seeds, casingMap]);

  // Fetch words with streaming
  const handleNavigateWord = async (nextWord: string, isSearch: boolean = false) => {
    if (!nextWord.trim()) return;

    const wasInSatelliteMode = showSatellites;
    const lowerNext = nextWord.toLowerCase();
    const lowerCenter = centerWord.toLowerCase();

    if (lowerNext === lowerCenter) {
      if (showSatellites) {
        handleGenerateSatellites(centerWord);
      } else {
        handleGenerateConnexes(centerWord);
      }
      return;
    }

    const initialNodes = [...allNodesOnMap];

    // Empêcher les doubles appels (ex: clic DOM + clic R3F simultanés)
    if (lowerNext === lastFetchedWordRef.current && loading) {
      console.log(`%c[NETWORK] 🛡️ Appel bloqué pour "${nextWord}" (déjà en cours)`, 'color: #f59e0b;');
      return;
    }

    // Gestion du parcours (Fil d'Ariane)
    setHistory(prev => {
      const lowerNext = nextWord.toLowerCase();
      const lowerPath = prev.map(w => w.toLowerCase());

      // 1. Si déjà dans le fil d'ariane, on garde tout le chemin intact (Passion ne disparaît pas quand on clique sur Amour)
      const existingIndex = lowerPath.indexOf(lowerNext);
      if (existingIndex !== -1) {
        return prev;
      }

      // 2. Si on explore un nouveau mot (ex: Tendresse depuis Amour), on embranche depuis le mot actif actuel
      const activeIdx = lowerPath.indexOf(centerWord.toLowerCase());
      if (activeIdx !== -1) {
        const baseCased = prev.slice(0, activeIdx + 1);
        const nextCased = casingMap[lowerNext] || (nextWord.charAt(0).toUpperCase() + nextWord.slice(1).toLowerCase());
        return [...baseCased, nextCased];
      }

      // 3. Fallback : calcul du plus court chemin réel
      const path = getShortestPath(nextWord);
      return path;
    });

    // Mettre à jour la map des casses pour le fil d'ariane
    setCasingMap(prev => ({ ...prev, [nextWord.toLowerCase()]: nextWord.charAt(0).toUpperCase() + nextWord.slice(1).toLowerCase() }));

    // Initialisation dynamique de la première seed si vide
    if (seeds.length === 0) {
      setSeeds([nextWord]);
    }

    setCenterWord(nextWord);
    setForceConnectTo(null); // Reset par défaut

    // On l'ajoute immédiatement à la liste des mots sur la map
    setAllNodesOnMap(prev => Array.from(new Set([...prev, nextWord])));

    // Calculer les voisins actuels du mot dans le graphe existant
    const neighbors = new Set<string>();
    edges.forEach(edge => {
      const [a, b] = edge.split('|');
      if (a === lowerNext) neighbors.add(b);
      if (b === lowerNext) neighbors.add(a);
    });

    const hasSatellites = satelliteBrandables[lowerNext] && satelliteBrandables[lowerNext].length > 0;

    // Cas 1 : Déjà exploré (dans le cache)
    if (exploredCache[lowerNext]) {
      console.log(`%c[Constellation] 🧠 Récupération depuis le cache : "${nextWord}"`, 'color: #10b981; font-weight: bold');
      
      const cachedWords = exploredCache[lowerNext] || [];
      const currentNeighbors = Array.from(neighbors).filter(n => cachedWords.map(w => w.toLowerCase()).includes(n.toLowerCase()));
      
      const toShow = currentNeighbors.length > 0 ? currentNeighbors : cachedWords.slice(0, 5);
      setRelatedWords(toShow);
      setInitialized(true); 

      // Préchauffage des satellites en arrière-plan si absents du cache
      if (useNaming && !hasSatellites) {
        handleGenerateSatellites(nextWord);
      }
      return;
    }

    // Déterminer si le mot était déjà présent sur la carte (avant l'ajout récent)
    const wasAlreadyOnMap = initialNodes.some(w => w.toLowerCase() === lowerNext);

    // Cas 2 : Pas encore exploré, mais cliqué sur la carte (déjà visible)
    // Comportement : on se déplace simplement dessus, SANS lancer de génération automatique
    if (!isSearch && wasAlreadyOnMap && initialized) {
      console.log(`%c[Constellation] 📍 Déplacement simple vers "${nextWord}"`, 'color: #3b82f6; font-style: italic;');
      setRelatedWords(Array.from(neighbors)); // Affiche les connexions existantes sur la map
      setInitialized(true);

      // Préchauffage des satellites en arrière-plan
      if (useNaming && !hasSatellites) {
        handleGenerateSatellites(nextWord);
      }
      return;
    }

    const startTime = performance.now();
    setRelatedWords([]);
    setLoading(true);
    lastFetchedWordRef.current = lowerNext;

    // Annuler la requête précédente si elle existe
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      console.log(`%c[CONSTELLATION] 📡 Envoi du prompt: "${nextWord}"`, 'color: #00f2fe; font-weight: bold; font-size: 11px; padding: 4px; background: rgba(0,242,254,0.1); border-radius: 4px;');

      // Lancer les deux requêtes en parallèle (Invisible Bridge) 
      // Si c'est une recherche ou si le mot n'est pas encore sur la map
      const isAlreadyOnMap = allNodesOnMap.some(w => w.toLowerCase() === lowerNext);
      const shouldCheckConnect = (isSearch || !isAlreadyOnMap) && initialized && allNodesOnMap.length > 0;

      if (shouldCheckConnect) {
        console.log(`%c[BRIDGE] 🛰️ Analyse de connexion pour "${nextWord}"...`, 'color: #f472b6; font-weight: bold;');
        console.log(`%c[BRIDGE] 📦 Mots en mémoire: [${allNodesOnMap.join(', ')}]`, 'color: #94a3b8; font-size: 10px;');
      }

      const generatePromise = fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: nextWord, 
          app: 'constellation',
          mode: useNaming ? 'naming' : 'classic',
          target: useNaming ? 'both' : 'concepts', // Toujours récupérer les deux si useNaming est actif (évite la latence)
          conceptsCount: 10,
          brandablesCount: 18 // Création de 18 items pour alimenter la réserve locale
        }),
        signal: abortController.signal
      });

      const connectPromise = shouldCheckConnect ? (async () => {
        const body = {
          words: [nextWord],
          existingWords: allNodesOnMap,
          seeds: seeds // Mots de départ pour contexte scalable
        };
        console.log(`%c[BRIDGE] 📤 Envoi requête connect:`, 'color: #f472b6; font-size: 10px;', body);

        try {
          const r = await fetch('/api/connect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: abortController.signal
          });
          const data = await r.json();
          console.log(`%c[BRIDGE] 📥 Réception connect:`, 'color: #f472b6; font-size: 10px;', data);
          return data;
        } catch (err: any) {
          if (err.name === 'AbortError') {
            console.log(`%c[BRIDGE] 🛡️ Requête connect annulée pour "${nextWord}"`, 'color: #94a3b8; font-style: italic;');
            return { connections: {} };
          }
          console.error("[BRIDGE ERROR]", err);
          return { connections: {} };
        }
      })() : Promise.resolve({ connections: {} });

      // On n'attend plus connectPromise pour lancer le stream de generate
      const response = await generatePromise;

      connectPromise.then(connectData => {
        if (connectData && connectData.connections && connectData.connections[nextWord]) {
          const connectedTo = connectData.connections[nextWord];
          console.log(`%c[BRIDGE] 🌉 Connexion magique trouvée : "${nextWord}" <-> "${connectedTo}"`, 'color: #f472b6; font-weight: bold;');

          setForceConnectTo(connectedTo);

          setEdges(prev => {
            const next = new Set(prev);
            const pair = [nextWord.toLowerCase(), connectedTo.toLowerCase()].sort().join('|');
            next.add(pair);
            return next;
          });

          setParentsMap(prev => {
            const lowerTarget = nextWord.toLowerCase();
            const lowerParent = connectedTo.toLowerCase();

            // On ne définit le parent que si le mot n'en a pas et n'est pas le premier seed
            const firstSeed = seeds[0] ? seeds[0].toLowerCase() : '';
            if (!prev[lowerTarget] && lowerTarget !== firstSeed) {
              return { ...prev, [lowerTarget]: connectedTo };
            }
            return prev;
          });

          // Rafraîchir l'histoire une fois le lien enregistré
          setTimeout(() => {
            setHistory(() => getShortestPath(nextWord));
          }, 50);
        } else if (shouldCheckConnect) {
          console.log(`%c[BRIDGE] ⚪ Aucune connexion forte identifiée pour "${nextWord}". Ajout aux seeds.`);
          setSeeds(prev => Array.from(new Set([...prev, nextWord])));
        }
      });

      const modelName = response.headers.get('X-Model-Used') || 'Gemini 3 Flash (Auto)';
      console.log(`%c[CONSTELLATION] 🤖 Modèle: ${modelName}`, 'color: #f0f0f0; font-style: italic;');

      if (!response.ok) throw new Error(`Erreur serveur (${response.status})`);
      if (!response.body) throw new Error('Aucun flux de streaming retourné.');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let fullText = '';
      let chunkCount = 0;
      let finalWords: string[] = [];

      console.groupCollapsed(`%c[CONSTELLATION] 📦 Réception des chunks pour "${nextWord}"`, 'color: #a78bfa;');

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;

        const chunkValue = decoder.decode(value, { stream: !done });

        if (chunkValue) {
          chunkCount++;
          fullText += chunkValue;

          console.log(`%cChunk ${chunkCount}:`, 'color: #8b5cf6; font-weight: bold;', chunkValue);

          let conceptsText = fullText;
          let brandablesText = "";

          if (fullText.includes("===")) {
            const splitMode = fullText.split("===");
            conceptsText = splitMode[0];
            brandablesText = splitMode[1] || "";
          }

          const parts = conceptsText.split(/[|\n]/);
          const wordsToDisplay = (done && !conceptsText.endsWith('|')) ? parts : parts.slice(0, -1);

          const rawWords = wordsToDisplay
            .map(w => w.trim().toLowerCase())
            .filter(w => {
              if (!w || w.toLowerCase() === nextWord.toLowerCase()) return false;
              if (/^[-—*]|\d+\./.test(w)) return false;
              if (w.length > 25 || w.split(/\s+/).length > 2) return false;
              return true;
            });

          // Supprimer les doublons
          finalWords = Array.from(new Set(rawWords)).slice(0, 10);

          if (finalWords.length > 0) {
            setInitialized(true); // Active l'affichage du graphe 3D dès que les premiers mots sont prêts

            // Mettre à jour le casing map pour les related words aussi
            setCasingMap(prev => {
              const next = { ...prev };
              finalWords.forEach(w => {
                next[w.toLowerCase()] = w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
              });
              return next;
            });
          }

          // Gérer la partie Brandables (Satellites)
          if (useNaming && brandablesText) {
            const brandableItems: { name: string; desc: string }[] = [];
            const rawBrandableParts = brandablesText.split(/[|\n]/);
            rawBrandableParts.forEach(item => {
              const cleaned = item.trim();
              if (cleaned && cleaned.includes(":")) {
                const parts = cleaned.split(":");
                const bName = parts[0].trim().toLowerCase();
                const bDesc = parts.slice(1).join(":").trim();
                if (bName && bDesc && bName !== nextWord.toLowerCase() && !bName.includes("===")) {
                  brandableItems.push({ name: bName, desc: bDesc });
                }
              }
            });
            if (brandableItems.length > 0) {
              // Remplir la réserve complète (tous les 15 items)
              setSatelliteReserve(prev => ({
                ...prev,
                [nextWord.toLowerCase()]: brandableItems
              }));

              // N'afficher directement que les 6 premiers
              setSatelliteBrandables(prev => ({
                ...prev,
                [nextWord.toLowerCase()]: brandableItems.slice(0, 6)
              }));
            }
          }
        }
      }
      console.groupEnd();

      // Mise à jour du cache une fois le flux terminé
      if (finalWords.length > 0) {
        setExploredCache(prev => ({
          ...prev,
          [nextWord.toLowerCase()]: finalWords
        }));

        // Déployer automatiquement les 5 premiers concepts connexes
        const toShow = finalWords.slice(0, 5);

        setRelatedWords(prev => Array.from(new Set([...prev, ...toShow])));

        setEdges(prev => {
          const next = new Set(prev);
          toShow.forEach(w => {
            const pair = [nextWord.toLowerCase(), w].sort().join('|');
            next.add(pair);
          });
          return next;
        });

        setParentsMap(prev => {
          const nextParents = { ...prev };
          const firstSeed = seeds[0] ? seeds[0].toLowerCase() : '';
          toShow.forEach(w => {
            if (w !== firstSeed && w !== nextWord.toLowerCase() && !nextParents[w]) {
              nextParents[w] = nextWord;
            }
          });
          return nextParents;
        });

        setAllNodesOnMap(prev => Array.from(new Set([...prev, ...toShow])));

        // Lancer la connexion sémantique secondaire en batch pour ces 5 nouveaux mots (désactivé pour éviter les structures en diamant et le recroquevillement)
        /*
        if (initialized && allNodesOnMap.length > 0) {
          console.log(`%c[BRIDGE] 🛰️ Analyse de connectivité secondaire automatique pour ${toShow.length} connexes...`, 'color: #f472b6; font-weight: bold;');
          fetch('/api/connect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              words: toShow,
              existingWords: [...allNodesOnMap, ...toShow],
              seeds: seeds
            })
          })
          .then(r => r.json())
          .then(connectData => {
            if (connectData && connectData.connections) {
              setEdges(prev => {
                const nextEdges = new Set(prev);
                Object.entries(connectData.connections).forEach(([w, target]) => {
                  if (target) {
                    console.log(`%c[BRIDGE] 🌉 Connexion secondaire trouvée : "${w}" <-> "${target}"`, 'color: #f472b6; font-weight: bold;');
                    const pair = [w.toLowerCase(), (target as string).toLowerCase()].sort().join('|');
                    nextEdges.add(pair);
                  }
                });
                return nextEdges;
              });
            }
          })
          .catch(err => console.error("[SECONDARY CONNECT ERROR]", err));
        }
        */
      }

      setInitialized(true); // Active le graphe 3D au cas où
      console.log(`%c[CONSTELLATION] ✅ Graphe étendu: [${finalWords.join(', ')}]`, 'color: #10b981; font-weight: bold;');
      console.log(`%c[CONSTELLATION] ⏱️ Temps total: ${Math.round(performance.now() - startTime)}ms`, 'color: #94a3b8;');


    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('[NETWORK] Requête annulée.');
        return;
      }
      console.error(`[ERROR] ${Math.round(performance.now() - startTime)}ms:`, error);
      setErrorMessage(error.message || t.errDefault);
      setTimeout(() => setErrorMessage(null), 4000);
    } finally {
      setLoading(false);
      // On garde lastFetchedWordRef pour éviter les rebonds immédiats si besoin
    }
  };

  const handleGenerateSatellites = async (word: string) => {
    if (!word) return;
    const lowerWord = word.toLowerCase();
    setLoadingSatellites(true);

    try {
      console.log(`%c[SATELLITES] 🛰️ Début génération satellites pour : "${word}"`, 'color: #3b82f6; font-weight: bold; font-size: 11px;');

      const existingNamesSet = new Set((satelliteBrandables[lowerWord] || []).map(b => b.name.toLowerCase()));
      const unusedBrandables = (satelliteReserve[lowerWord] || []).filter(b => !existingNamesSet.has(b.name.toLowerCase()));
      let newBrandablesToUse: {name: string; desc: string}[] = [];

      console.log(`%c[SATELLITES] 📊 État de la réserve locale pour "${word}" : ${unusedBrandables.length} disponibles / 6 requis`, 'color: #94a3b8; font-style: italic;');

      if (unusedBrandables.length >= 6) {
        newBrandablesToUse = unusedBrandables.slice(0, 6);
        console.log(`%c[SATELLITES] 🟢 RÉSERVE UTILISÉE : 6 satellites piochés instantanément (sans IA). Reste en réserve: ${unusedBrandables.length - 6}`, 'color: #22c55e; font-weight: bold;');
      } else {
        const excludeList = Array.from(new Set([
          ...Array.from(existingNamesSet),
          ...(satelliteReserve[lowerWord] || []).map(b => b.name.toLowerCase())
        ]));

        console.log(`%c[SATELLITES] 📡 APPEL IA REQUIS : Demande de 18 satellites (Exclus: ${excludeList.length} mots)`, 'color: #f59e0b; font-weight: bold;');

        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            prompt: word, 
            app: 'constellation',
            mode: 'naming', // Toujours naming pour satellites
            target: 'brandables',
            brandablesCount: 18,
            exclude: excludeList
          })
        });

        if (!response.ok) throw new Error(`Erreur serveur satellites (${response.status})`);
        
        const responseText = await response.text();
        const brandableItems: { name: string; desc: string }[] = [];
        const rawBrandableParts = responseText.split(/[|\n]/);
        
        const currentReserveSet = new Set(excludeList);

        rawBrandableParts.forEach(item => {
          const cleaned = item.trim();
          if (cleaned && cleaned.includes(":")) {
            const parts = cleaned.split(":");
            const bName = parts[0].trim().toLowerCase();
            const bDesc = parts.slice(1).join(":").trim();
            if (bName && bDesc && bName !== lowerWord && !bName.includes("===")) {
              if (!currentReserveSet.has(bName)) {
                brandableItems.push({ name: bName, desc: bDesc });
                currentReserveSet.add(bName);
              }
            }
          }
        });

        console.log(`%c[SATELLITES] 📥 IA RÉPONSE : ${brandableItems.length} satellites générés avec succès.`, 'color: #10b981; font-weight: bold;');

        if (brandableItems.length > 0) {
          setSatelliteReserve(prev => {
            const current = prev[lowerWord] || [];
            return {
              ...prev,
              [lowerWord]: [...current, ...brandableItems]
            };
          });
        }
        
        const allUnused = [...unusedBrandables, ...brandableItems];
        newBrandablesToUse = allUnused.slice(0, 6);
        console.log(`%c[SATELLITES] ✨ Affichage des 6 nouveaux satellites. Stock restant en réserve: ${allUnused.length - newBrandablesToUse.length}`, 'color: #10b981;');
      }

      if (newBrandablesToUse.length > 0) {
        setSatelliteBrandables(prev => {
          const current = prev[lowerWord] || [];
          return {
            ...prev,
            [lowerWord]: [...current, ...newBrandablesToUse]
          };
        });
        // Suppression de setShowSatellites(true) pour rester dans le mode actuel
      } else {
        console.log(`%c[CONSTELLATION] ℹ️ Aucun nouveau satellite trouvé pour "${word}"`, 'color: #94a3b8;');
      }
    } catch (err) {
      console.error("[SATELLITES GENERATION ERROR]", err);
    } finally {
      setLoadingSatellites(false);
    }
  };



  const handleGenerateConnexes = async (word: string) => {
    if (!word) return;
    const lowerWord = word.toLowerCase();
    setLoadingConnexes(true);

    try {
      console.log(`%c[CONNEXES] 🛰️ Début génération connexes pour : "${word}"`, 'color: #3b82f6; font-weight: bold; font-size: 11px;');

      const unusedConcepts = (exploredCache[lowerWord] || []).filter(w => !allNodesOnMap.map(a => a.toLowerCase()).includes(w));
      let newWordsToUse: string[] = [];

      console.log(`%c[CONNEXES] 📊 État de la réserve locale pour "${word}" : ${unusedConcepts.length} disponibles / 5 requis`, 'color: #94a3b8; font-style: italic;');

      if (unusedConcepts.length >= 5) {
        newWordsToUse = unusedConcepts.slice(0, 5);
        console.log(`%c[CONNEXES] 🟢 RÉSERVE UTILISÉE : 5 connexes piochés instantanément (sans IA). Reste en réserve: ${unusedConcepts.length - 5}`, 'color: #22c55e; font-weight: bold;');
      } else {
        const neighbors = new Set<string>();
        edges.forEach(edge => {
          const [a, b] = edge.split('|');
          if (a === lowerWord) neighbors.add(b);
          if (b === lowerWord) neighbors.add(a);
        });

        const alreadyKnown = new Set([
          ...(exploredCache[lowerWord] || []),
          ...Array.from(neighbors),
        ]);

        console.log(`%c[CONNEXES] 📡 APPEL IA REQUIS : Demande de 10 connexes (Exclus: ${alreadyKnown.size} mots)`, 'color: #f59e0b; font-weight: bold;');

        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            prompt: word, 
            app: 'constellation',
            mode: useNaming ? 'naming' : 'classic',
            target: 'concepts',
            conceptsCount: 10,
            exclude: Array.from(alreadyKnown)
          })
        });

        if (!response.ok) throw new Error(`Erreur serveur connexes (${response.status})`);
        
        const responseText = await response.text();
        const parts = responseText.split(/[|\n]/);
        const rawWords = parts
          .map(w => w.trim().toLowerCase())
          .filter(w => {
            if (!w || w === lowerWord) return false;
            if (/^[-—*]|\d+\./.test(w)) return false;
            if (w.length > 25 || w.split(/\s+/).length > 2) return false;
            if (alreadyKnown.has(w)) return false;
            return true;
          });

        const newGeneratedWords = Array.from(new Set(rawWords)).slice(0, 10);
        console.log(`%c[CONNEXES] 📥 IA RÉPONSE : ${newGeneratedWords.length} connexes générés avec succès.`, 'color: #10b981; font-weight: bold;');
        
        if (newGeneratedWords.length > 0) {
          setExploredCache(prev => {
            const currentCacheWords = prev[lowerWord] || [];
            return { ...prev, [lowerWord]: Array.from(new Set([...currentCacheWords, ...newGeneratedWords])) };
          });
        }
        
        const allUnused = [...unusedConcepts, ...newGeneratedWords];
        newWordsToUse = Array.from(new Set(allUnused)).slice(0, 5);
        console.log(`%c[CONNEXES] ✨ Affichage des 5 nouveaux connexes. Stock restant en réserve: ${allUnused.length - newWordsToUse.length}`, 'color: #10b981;');
      }

      if (newWordsToUse.length > 0) {
        // N'ajouter à relatedWords que SI c'est pour le nœud central actuellement actif
        if (lowerWord === centerWord.toLowerCase()) {
          setRelatedWords(prev => Array.from(new Set([...prev, ...newWordsToUse])));
        }

        // Enregistrer les liaisons primaires
        setEdges(prev => {
          const next = new Set(prev);
          newWordsToUse.forEach(w => {
            const pair = [lowerWord, w].sort().join('|');
            next.add(pair);
          });
          return next;
        });

        // Définir le parent de ces nouveaux nœuds s'ils n'en ont pas
        setParentsMap(prev => {
          const nextParents = { ...prev };
          const firstSeed = seeds[0] ? seeds[0].toLowerCase() : '';
          newWordsToUse.forEach(w => {
            if (w !== firstSeed && w !== lowerWord && !nextParents[w]) {
              nextParents[w] = word;
            }
          });
          return nextParents;
        });

        // Mettre à jour le casing map pour les nouveaux mots
        setCasingMap(prev => {
          const next = { ...prev };
          newWordsToUse.forEach(w => {
            if (!next[w]) {
              next[w] = w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
            }
          });
          return next;
        });

        // Ajouter ces nouveaux nœuds connexes à la carte générale
        setAllNodesOnMap(prev => Array.from(new Set([...prev, ...newWordsToUse])));

        // Activer automatiquement le mode concepts pour afficher ce qu'on vient de créer
        setShowSatellites(false);
        setUserPreferredShowSatellites(false);

        // --- INTERCONNEXION SÉMANTIQUE SECONDAIRE DES CONNEXES BATCH --- (désactivé pour éviter les structures en diamant et le recroquevillement)
        /*
        const initialNodes = allNodesOnMap;
        const newlyCreatedWords = newWordsToUse.filter(
          w => !initialNodes.some(initWord => initWord.toLowerCase() === w)
        );

        if (newlyCreatedWords.length > 0) {
          console.log(`%c[BRIDGE] 🛰️ Analyse de connectivité secondaire pour ${newlyCreatedWords.length} connexes...`, 'color: #f472b6; font-weight: bold;');
          
          const eligibleExisting = Array.from(new Set([
            ...initialNodes,
            ...newWordsToUse,
            word
          ])).filter(w => !newlyCreatedWords.includes(w.toLowerCase()) && w.toLowerCase() !== lowerWord);

          if (eligibleExisting.length > 0) {
            try {
              const body = {
                words: newlyCreatedWords,
                existingWords: eligibleExisting,
                seeds: seeds
              };

              const r = await fetch('/api/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
              });
              const connectData = await r.json();

              if (connectData && connectData.connections) {
                setEdges(prev => {
                  const next = new Set(prev);
                  Object.entries(connectData.connections).forEach(([newWord, target]) => {
                    if (target) {
                      console.log(`%c[BRIDGE] 🌉 Connexion secondaire trouvée : "${newWord}" <-> "${target}"`, 'color: #f472b6; font-weight: bold;');
                      const pair = [newWord.toLowerCase(), (target as string).toLowerCase()].sort().join('|');
                      next.add(pair);
                    }
                  });
                  return next;
                });
              }
            } catch (err: any) {
              console.error(`[BRIDGE ERROR BATCH]`, err);
            }
          }
        }
        */
      } else {
        console.log(`%c[CONSTELLATION] ℹ️ Aucun nouveau connexe trouvé pour "${word}" (tous déjà présents)`, 'color: #94a3b8;');
      }
    } catch (err) {
      console.error("[CONNEXES GENERATION ERROR]", err);
    } finally {
      setLoadingConnexes(false);
    }
  };

  const handleDoubleClickWord = (word: string) => {
    if (!word) return;
    console.log(`%c[Constellation] ⚡ Double-clic détecté sur "${word}". Extension du réseau sans déplacement.`, 'color: #f59e0b; font-weight: bold;');
    handleGenerateConnexes(word);
  };

  const handleZoomChange = useCallback((zoom: number) => {
    const isMobileDevice = typeof window !== 'undefined' && window.innerWidth < 768;
    const maxSatZoom = isMobileDevice ? 10 : 18;
    
    const shouldShowSatellites = zoom > maxSatZoom;
    setShowSatellites(shouldShowSatellites);
    // Crucial fix: Sync the user's intent to ensure zooming toggles the mode unconditionally
    setUserPreferredShowSatellites(shouldShowSatellites);
  }, [setUserPreferredShowSatellites]);

  const handleDeleteNode = useCallback((wordToDelete: string) => {
    if (!wordToDelete) return;
    const lowerTarget = wordToDelete.toLowerCase();

    // 1. Trouver tous les descendants récursivement (fils)
    const descendants = new Set<string>();
    const queue = [lowerTarget];
    while (queue.length > 0) {
      const current = queue.shift()!;
      Object.entries(parentsMap).forEach(([childLower, parent]) => {
        if (parent.toLowerCase() === current && !descendants.has(childLower)) {
          descendants.add(childLower);
          queue.push(childLower);
        }
      });
    }

    const nodesToDelete = new Set([lowerTarget, ...descendants]);

    // 2. Déterminer le nouveau centerWord si le mot supprimé est le centerWord actuel
    let nextCenter: string | null = null;
    if (lowerTarget === centerWord.toLowerCase()) {
      // Priorité 1 : Le parent du mot actuel
      const parentName = parentsMap[lowerTarget];
      if (parentName && !nodesToDelete.has(parentName.toLowerCase())) {
        nextCenter = parentName;
      } else {
        // Priorité 2 : Le mot précédent dans l'historique
        const lowerHistory = history.map(w => w.toLowerCase());
        const centerIdx = lowerHistory.indexOf(lowerTarget);
        if (centerIdx > 0) {
          for (let i = centerIdx - 1; i >= 0; i--) {
            if (!nodesToDelete.has(lowerHistory[i])) {
              nextCenter = history[i];
              break;
            }
          }
        }

        // Priorité 3 : Première graine (seed) restante ou n'importe quel concept restant
        if (!nextCenter) {
          const remainingSeeds = seeds.filter(w => !nodesToDelete.has(w.toLowerCase()));
          if (remainingSeeds.length > 0) {
            nextCenter = remainingSeeds[0];
          } else {
            const remainingNodes = allNodesOnMap.filter(w => !nodesToDelete.has(w.toLowerCase()));
            if (remainingNodes.length > 0) {
              nextCenter = remainingNodes[0];
            }
          }
        }
      }
    }

    // 3. Mettre à jour tous les états de l'application
    const remainingNodes = allNodesOnMap.filter(w => !nodesToDelete.has(w.toLowerCase()));
    setAllNodesOnMap(remainingNodes);

    setEdges(prev => {
      const next = new Set<string>();
      prev.forEach(edgeStr => {
        const [a, b] = edgeStr.split('|');
        if (!nodesToDelete.has(a.toLowerCase()) && !nodesToDelete.has(b.toLowerCase())) {
          next.add(edgeStr);
        }
      });
      return next;
    });

    setParentsMap(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(childLower => {
        const parentLower = next[childLower].toLowerCase();
        if (nodesToDelete.has(childLower) || nodesToDelete.has(parentLower)) {
          delete next[childLower];
        }
      });
      return next;
    });

    setSeeds(prev => prev.filter(w => !nodesToDelete.has(w.toLowerCase())));
    setHistory(prev => prev.filter(w => !nodesToDelete.has(w.toLowerCase())));

    setExploredCache(prev => {
      const next = { ...prev };
      nodesToDelete.forEach(lower => {
        delete next[lower];
      });
      Object.keys(next).forEach(key => {
        next[key] = next[key].filter(w => !nodesToDelete.has(w.toLowerCase()));
      });
      return next;
    });

    if (lowerTarget === centerWord.toLowerCase()) {
      if (nextCenter) {
        setCenterWord(nextCenter);
        const lowerNext = nextCenter.toLowerCase();
        if (exploredCache[lowerNext]) {
          setRelatedWords(exploredCache[lowerNext]);
        } else {
          setRelatedWords([]);
          handleNavigateWord(nextCenter);
        }
      } else {
        setCenterWord('');
        setRelatedWords([]);
        setInitialized(false);
      }
    } else {
      setRelatedWords(prev => prev.filter(w => !nodesToDelete.has(w.toLowerCase())));
    }
  }, [centerWord, parentsMap, history, seeds, allNodesOnMap, exploredCache, handleNavigateWord]);

  // Navigation avec les flèches gauche/droite dans le fil d'Ariane, et suppression de nœuds
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.hasAttribute('contenteditable')
      )) {
        return;
      }

      if (e.key === 'ArrowLeft') {
        const lowerPath = history.map(w => w.toLowerCase());
        const currentIndex = lowerPath.indexOf(centerWord.toLowerCase());
        if (currentIndex > 0) {
          e.preventDefault();
          handleNavigateWord(history[currentIndex - 1]);
        }
      } else if (e.key === 'ArrowRight') {
        const lowerPath = history.map(w => w.toLowerCase());
        const currentIndex = lowerPath.indexOf(centerWord.toLowerCase());
        if (currentIndex !== -1 && currentIndex < history.length - 1) {
          e.preventDefault();
          handleNavigateWord(history[currentIndex + 1]);
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (centerWord) {
          e.preventDefault();
          handleDeleteNode(centerWord);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [history, centerWord, handleNavigateWord, handleDeleteNode]);


  const handleCustomJump = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputWord.trim()) return;
    handleNavigateWord(inputWord.trim(), true);
    setInputWord('');
  };

  const currentTheme = THEMES[activeTheme] || THEMES.AMBER;

  const totalSatellitesCount = Object.values(satelliteBrandables).reduce((acc, curr) => acc + curr.length, 0);

  // themeStyle : uniquement les tokens de couleur dynamiques (thème actif).
  // Les polices (--app-font-display, --app-font-body) sont définies dans
  // apps/constellation/src/fonts.css — ne pas les écraser ici.
  const themeStyle = {
    '--theme-bg': currentTheme.colors.background,
    '--theme-text': currentTheme.colors.text,
    '--theme-primary': currentTheme.colors.primary,
    '--theme-secondary': currentTheme.colors.secondary,
    '--theme-card': currentTheme.colors.card,
    '--theme-input': currentTheme.colors.input,
    '--theme-border': currentTheme.colors.border,
    '--theme-placeholder': currentTheme.colors.placeholder,
    '--theme-caret': currentTheme.colors.caret,
    '--theme-input-size': currentTheme.typography.inputSize,
    '--theme-result-size': currentTheme.typography.resultSize,
    '--theme-heading-transform': currentTheme.typography.headingTransform,
    '--theme-heading-tracking': currentTheme.typography.headingTracking,
    '--theme-radius': currentTheme.ui.borderRadius,
    '--theme-border-width': currentTheme.ui.borderWidth,
    '--theme-shadow': currentTheme.ui.boxShadow,
    '--theme-button-shadow': currentTheme.ui.buttonShadow,
    '--app-scanline-opacity': activeTheme === 'AMBER' ? '0.015' : activeTheme === 'RAW_MINIMAL' ? '0.00' : '0.003',
    '--app-vignette-opacity': activeTheme === 'AMBER' ? '0.30' : activeTheme === 'RAW_MINIMAL' ? '0.00' : '0.05',
    backgroundColor: 'var(--theme-bg)',
    color: 'var(--theme-text)',
    fontFamily: 'var(--app-font-body)',
  } as any;

  return (
    <div
      className="min-h-[100dvh] w-full relative overflow-hidden flex flex-col justify-between selection:bg-[var(--theme-primary)] selection:text-[var(--theme-bg)]"
      style={themeStyle}
    >
      {/* Texture overlays */}
      <div className="scanlines" />
      <div className="vignette" />

      {/* Boot Sequence Overlay */}
      <AnimatePresence>
        {!bootComplete && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.4 } }}
            className="fixed inset-0 z-[300] flex flex-col justify-center items-start px-12 gap-3"
            style={{ backgroundColor: 'var(--theme-bg)' }}
          >
            {BOOT_LINES.map((line) => (
              <p
                key={line.text}
                className={`${line.cls} font-mono text-[11px] tracking-[0.3em] uppercase`}
                style={{
                  color: line.cls.includes('boot-line-4') ? 'var(--theme-primary)' : 'var(--theme-text)',
                  opacity: line.cls.includes('boot-line-4') ? 1.0 : 0.7,
                  fontFamily: 'var(--theme-font-display)'
                }}
              >
                {line.text}
              </p>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- CODE ORIGINAL POUR REVERT --- */}
      {/*
     
      */}

      {/* --- NOUVELLE INTERFACE DYNAMIQUE --- */}
      {/* 3D Constellation Layer */}
      {initialized && centerWord && (
        <Constellation3DV2
          centerWord={centerWord}
          relatedWords={relatedWords}
          forceConnectTo={forceConnectTo}
          parentsMap={parentsMap}
          onWordClick={handleNavigateWord}
          isLoading={loading}
          nodeCount={allNodesOnMap.length}
          activeTheme={activeTheme}
          labelsOpaque={labelsOpaque}
          showSatellites={showSatellites}
          externalEdges={edges}
          allNodesOnMap={allNodesOnMap}
          satelliteBrandables={satelliteBrandables[centerWord.toLowerCase()] || []}
          onGenerateConnexesClick={handleGenerateConnexes}
          loadingConnexes={loadingConnexes}
          onGenerateSatellitesClick={useNaming ? handleGenerateSatellites : undefined}
          loadingSatellites={loadingSatellites}
          onZoomChange={handleZoomChange}
          onWordDoubleClick={handleDoubleClickWord}
        />
      )}

      {/* Reworked Intro Screen */}
      <AnimatePresence>
        {!initialized && bootComplete && (
          <motion.div
            key="intro-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.6 } }}
            className="absolute inset-0 z-30 flex flex-col justify-center items-center px-6 pointer-events-auto"
          >
            <div className="max-w-2xl w-full flex flex-col items-center text-center gap-8 relative">
              {/* Visual glow backdrop */}
              <div
                className="absolute w-[350px] h-[350px] rounded-full blur-[100px] opacity-[0.08] pointer-events-none"
                style={{ background: 'var(--theme-primary)' }}
              />

              {/* Animated title */}
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.8 }}
                className="flex flex-col items-center gap-3 relative"
              >
                <h1
                  className="font-bold tracking-[-0.02em] leading-none select-none app-title"
                  style={{
                    fontSize: 'clamp(2.8rem, 8vw, 5.5rem)',
                    fontFamily: 'var(--app-font-display)',
                    fontStyle: 'italic',
                    filter: 'drop-shadow(0 0 20px rgba(229, 193, 88, 0.15))',
                    color: 'var(--theme-text)'
                  }}
                >
                  Constellation
                </h1>

                {useNaming && (
                  <span
                    className="font-mono text-[9px] sm:text-[11px] tracking-[0.3em] uppercase px-4 py-1.5 mt-2 border select-none"
                    style={{
                      borderColor: 'var(--theme-primary)',
                      color: 'var(--theme-primary)',
                      backgroundColor: 'rgba(229, 193, 88, 0.08)',
                      fontFamily: 'var(--app-font-body)',
                      letterSpacing: '0.25em'
                    }}
                  >
                    NAMING ASSISTANT
                  </span>
                )}

                <p
                  className="opacity-60 select-none tracking-[0.15em] max-w-lg leading-relaxed mt-2 app-subtitle"
                  style={{ fontSize: '11px', fontFamily: 'var(--app-font-body)' }}
                >
                  {t.subtitle}
                </p>
              </motion.div>

              {/* Central Search Box */}
              <motion.form
                layoutId="search-form"
                onSubmit={handleCustomJump}
                className="w-full max-w-lg mt-4 sm:mt-6 pointer-events-auto relative z-10"
              >
                <div className="flex items-center relative group">
                  <input
                    type="text"
                    className="w-full pl-12 pr-5 py-3 sm:py-4 rounded-none text-[13px] focus:outline-none transition-all duration-300 placeholder:tracking-[0.1em] tracking-[0.15em] font-mono"
                    style={{
                      background: 'var(--theme-card)',
                      border: '1px solid var(--theme-primary)',
                      color: 'var(--theme-text)',
                      boxShadow: '0 0 30px rgba(245, 166, 35, 0.05)'
                    }}
                    placeholder={t.placeholderInit}
                    value={inputWord}
                    onChange={(e) => setInputWord(e.target.value)}
                    maxLength={25}
                    autoFocus
                  />
                  <svg
                    className="absolute left-4 w-5 h-5 transition-colors pointer-events-none"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    style={{ stroke: 'var(--theme-primary)' }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 sm:px-8 py-3 sm:py-4 text-[11px] sm:text-[12px] font-mono tracking-widest uppercase transition-all duration-200 shrink-0 font-bold"
                    style={{
                      borderTop: '1px solid var(--theme-primary)',
                      borderBottom: '1px solid var(--theme-primary)',
                      borderRight: '1px solid var(--theme-primary)',
                      borderLeft: 'none',
                      background: 'var(--theme-primary)',
                      color: 'var(--theme-bg)',
                    }}
                  >
                    {loading ? t.btnLoading : t.btnExplore}
                  </button>
                </div>
              </motion.form>

              {/* Suggestions / Loading state */}
              <div className="h-16 flex items-center justify-center">
                <AnimatePresence mode="wait">
                  {loading ? (
                    <motion.div
                      key="loading-msg"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex flex-col items-center gap-2"
                    >
                      <div className="flex gap-1.5 justify-center items-center">
                        <span className="w-1.5 h-1.5 bg-[var(--theme-primary)] animate-pulse" />
                        <span className="w-1.5 h-1.5 bg-[var(--theme-primary)] animate-pulse delay-75" />
                        <span className="w-1.5 h-1.5 bg-[var(--theme-primary)] animate-pulse delay-150" />
                        <p
                          className="text-[10px] tracking-[0.15em] text-[var(--theme-primary)] ml-2"
                          style={{ fontFamily: 'var(--app-font-body)' }}
                        >
                          {t.loadingTitle}
                        </p>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="suggestions"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.7 }}
                      className="flex overflow-x-auto sm:flex-wrap gap-2.5 justify-start sm:justify-center w-full max-w-full sm:max-w-md pb-2 px-4 sm:px-0"
                      style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
                    >
                      {t.suggestions.map((word) => (
                        <button
                          key={word}
                          onClick={() => {
                            setInputWord(word);
                            handleNavigateWord(word, true);
                          }}
                          className="px-3 py-1 text-[9px] font-mono tracking-[0.15em] border border-dashed border-[var(--theme-primary)] border-opacity-30 hover:border-solid hover:border-opacity-100 text-[var(--theme-text)] opacity-60 hover:opacity-100 hover:text-[var(--theme-primary)] transition-all duration-150 rounded-none cursor-none min-h-[44px] sm:min-h-[unset] flex items-center justify-center shrink-0"
                          style={{ background: 'transparent' }}
                        >
                          {word}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Subtle Switchers on Intro Screen */}
              <div className="flex gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setActiveTheme(prev => prev === 'AMBER' ? 'POETIC_LIGHT' : prev === 'POETIC_LIGHT' ? 'RAW_MINIMAL' : 'AMBER')}
                  className="px-3 py-1.5 text-[9px] font-mono tracking-[0.15em] hover:opacity-100 transition-all duration-150 rounded-none cursor-none opacity-50 hover:opacity-80 app-theme-button min-h-[44px] sm:min-h-[unset] flex items-center justify-center"
                  style={{
                    border: '1px solid var(--theme-border)',
                    background: 'var(--theme-card)',
                    color: 'var(--theme-text)',
                  }}
                >
                  {activeTheme === 'AMBER' ? t.themeAmber : activeTheme === 'POETIC_LIGHT' ? t.themeLight : t.themeRawMinimal}
                </button>
                <button
                  type="button"
                  onClick={() => setLang(prev => prev === 'fr' ? 'en' : 'fr')}
                  className="px-3 py-1.5 text-[9px] font-mono tracking-[0.15em] hover:opacity-100 transition-all duration-150 rounded-none cursor-none opacity-50 hover:opacity-80 min-h-[44px] sm:min-h-[unset] flex items-center justify-center"
                  style={{
                    border: '1px solid var(--theme-border)',
                    background: 'var(--theme-card)',
                    color: 'var(--theme-text)',
                  }}
                >
                  {lang === 'fr' ? 'EN' : 'FR'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header (visible when initialized) */}
      {initialized && (
        <header className="w-full max-w-7xl mx-auto px-3 sm:px-8 pt-[max(env(safe-area-inset-top),0.8rem)] sm:pt-[max(env(safe-area-inset-top),2rem)] pb-2 sm:pb-5 flex flex-row justify-between items-center gap-3 z-40 pointer-events-none">
          <div className="pointer-events-auto flex flex-col gap-0 shrink-0">
            <h1
              className="font-bold tracking-[-0.02em] leading-tight select-none app-title"
              style={{
                fontFamily: 'var(--app-font-display)',
                fontStyle: 'italic',
                fontSize: 'clamp(1.2rem, 3.5vw, 2.2rem)',
                color: 'var(--theme-text)'
              }}
            >
              Constellation
            </h1>
            <div className="flex items-center gap-2 sm:gap-3 text-[8px] sm:text-[9px] tracking-widest font-mono uppercase opacity-60 ml-0.5 mt-0.5">
              <div className="flex items-center gap-1.5">
                <span className={`inline-block w-1 h-1 rounded-full ${loading ? 'bg-[var(--theme-primary)] animate-pulse' : 'bg-green-400'}`} />
                <span style={{ color: 'var(--theme-text)' }}>{loading ? t.statusLoading : t.statusLoaded}</span>
              </div>
              <span className="opacity-30">|</span>
              <span style={{ color: 'var(--theme-text)' }}>{t.statusNodes}: {allNodesOnMap.length}</span>
              <span className="opacity-30">|</span>
              <span style={{ color: 'var(--theme-text)' }}>Noms: {totalSatellitesCount}</span>
            </div>
          </div>

          {/* Compact Premium Control Deck */}
          <div className="flex flex-row items-center gap-2 md:gap-4 w-auto pointer-events-auto bg-[var(--theme-card)] border border-[var(--theme-border)] px-2 py-1.5 sm:px-4 sm:py-3 relative backdrop-blur-md"
            style={{
              boxShadow: '0 10px 30px -10px rgba(0,0,0,0.4)',
              borderWidth: 'var(--theme-border-width)',
              borderRadius: 'var(--theme-radius)'
            }}
          >
            {/* Search Input Container */}
            <motion.form
              layoutId="search-form"
              onSubmit={handleCustomJump}
              className="relative flex items-center w-[110px] sm:w-auto min-w-0 sm:min-w-[220px]"
            >
              <div className="w-full flex items-center relative group">
                <input
                  type="text"
                  className="w-full pl-7 sm:pl-9 pr-2 py-1.5 sm:py-2 bg-transparent text-[11px] sm:text-[12px] focus:outline-none transition-all duration-300 placeholder:tracking-[0.05em] tracking-[0.1em] font-mono border-b border-[var(--theme-border)] min-h-[36px] sm:min-h-[unset]"
                  style={{
                    borderColor: inputWord ? 'var(--theme-primary)' : 'var(--theme-border)',
                    color: 'var(--theme-text)',
                  }}
                  placeholder={t.placeholderSearch}
                  value={inputWord}
                  onChange={(e) => setInputWord(e.target.value)}
                  maxLength={25}
                />
                <svg
                  className="absolute left-1 sm:left-2.5 w-3.5 h-3.5 sm:w-4 sm:h-4 transition-colors pointer-events-none"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  style={{ stroke: inputWord ? 'var(--theme-primary)' : 'rgba(242,242,242,0.4)' }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </motion.form>

            {/* Desktop Separator */}
            <div className="hidden md:block w-[1px] h-6 bg-[var(--theme-border)] opacity-30" />

            {/* Tool buttons (Desktop only) */}
            <div className="hidden md:flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 sm:flex-wrap max-w-full shrink-0" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
              {/* Toggle Labels */}
              <button
                type="button"
                onClick={() => setLabelsOpaque(!labelsOpaque)}
                className="px-2.5 py-1.5 text-[9px] font-mono tracking-[0.15em] uppercase transition-all duration-150 border cursor-none min-h-[44px] sm:min-h-[unset] flex items-center justify-center"
                style={{
                  borderColor: labelsOpaque ? 'var(--theme-primary)' : 'var(--theme-border)',
                  background: labelsOpaque ? 'rgba(229, 193, 88, 0.08)' : 'transparent',
                  color: labelsOpaque ? 'var(--theme-primary)' : 'var(--theme-text)',
                  opacity: labelsOpaque ? 1.0 : 0.6,
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '1.0'}
                onMouseLeave={e => { if (!labelsOpaque) e.currentTarget.style.opacity = '0.6'; }}
              >
                {t.labelsControl}: {labelsOpaque ? t.labelsVisible : t.labelsAuto}
              </button>

              {/* Toggle Satellites / Focus (if useNaming) */}
              {useNaming && (
                <button
                  type="button"
                  onClick={() => {
                    const nextVal = !showSatellites;
                    setShowSatellites(nextVal);
                    setUserPreferredShowSatellites(nextVal);
                    if (nextVal && (!satelliteBrandables[centerWord.toLowerCase()] || satelliteBrandables[centerWord.toLowerCase()].length === 0)) {
                      handleGenerateSatellites(centerWord);
                    }
                  }}
                  className="px-2.5 py-1.5 text-[9px] font-mono tracking-[0.15em] uppercase transition-all duration-150 border cursor-none min-h-[44px] sm:min-h-[unset] flex items-center justify-center"
                  style={{
                    borderColor: showSatellites ? 'var(--theme-primary)' : 'var(--theme-border)',
                    background: showSatellites ? 'rgba(229, 193, 88, 0.08)' : 'transparent',
                    color: showSatellites ? 'var(--theme-primary)' : 'var(--theme-text)',
                    opacity: showSatellites ? 1.0 : 0.6,
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '1.0'}
                  onMouseLeave={e => { if (!showSatellites) e.currentTarget.style.opacity = '0.6'; }}
                >
                  Focus: {showSatellites ? 'Sats' : 'Sem'}
                </button>
              )}

              {/* Theme Toggle */}
              <button
                type="button"
                onClick={() => setActiveTheme(prev => prev === 'AMBER' ? 'POETIC_LIGHT' : prev === 'POETIC_LIGHT' ? 'RAW_MINIMAL' : 'AMBER')}
                className="px-2.5 py-1.5 text-[9px] font-mono tracking-[0.15em] uppercase transition-all duration-150 border cursor-none app-theme-button min-h-[44px] sm:min-h-[unset] flex items-center justify-center"
                style={{
                  borderColor: 'var(--theme-border)',
                  background: 'transparent',
                  color: 'var(--theme-text)',
                  opacity: 0.6,
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '1.0'}
                onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}
              >
                {activeTheme === 'AMBER' ? t.themeAmber : activeTheme === 'POETIC_LIGHT' ? t.themeLight : t.themeRawMinimal}
              </button>

              {/* Language Toggle */}
              <button
                type="button"
                onClick={() => setLang(prev => prev === 'fr' ? 'en' : 'fr')}
                className="px-2.5 py-1.5 text-[9px] font-mono tracking-[0.15em] uppercase transition-all duration-150 border cursor-none min-h-[44px] sm:min-h-[unset] flex items-center justify-center"
                style={{
                  borderColor: 'var(--theme-border)',
                  background: 'transparent',
                  color: 'var(--theme-text)',
                  opacity: 0.6,
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '1.0'}
                onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}
              >
                {lang === 'fr' ? 'EN' : 'FR'}
              </button>
            </div>

            {/* Delete Active Node - Optimized for Mobile */}
            <button
              type="button"
              onClick={() => handleDeleteNode(centerWord)}
              className="px-1.5 py-1 sm:px-2.5 sm:py-1.5 text-[9px] font-mono tracking-[0.15em] uppercase transition-all duration-150 border cursor-none hover:bg-[#ff4444] hover:text-white hover:border-[#ff4444] min-h-[36px] sm:min-h-[unset] flex items-center justify-center shrink-0"
              style={{
                borderColor: 'rgba(255, 68, 68, 0.4)',
                background: 'transparent',
                color: '#ff4444',
                opacity: 0.75,
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '1.0'}
              onMouseLeave={e => e.currentTarget.style.opacity = '0.75'}
            >
              <span className="hidden sm:inline">{lang === 'fr' ? 'Suppr' : 'Del'}</span>
              <span className="sm:hidden flex items-center">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </span>
            </button>

            {/* Mobile Menu Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden px-1.5 py-1 text-[9px] border border-[var(--theme-border)] cursor-none min-h-[36px] flex items-center justify-center shrink-0 text-[var(--theme-text)] bg-transparent"
              style={{
                borderColor: mobileMenuOpen ? 'var(--theme-primary)' : 'var(--theme-border)',
              }}
            >
              {mobileMenuOpen ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>

            {/* Mobile Dropdown Overlay */}
            <AnimatePresence>
              {mobileMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -15, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, scale: 0.95, y: -10, filter: 'blur(4px)' }}
                  transition={{ type: "spring", stiffness: 400, damping: 25, mass: 0.8 }}
                  className="absolute top-full right-0 mt-2 w-[200px] bg-[var(--theme-card)] border border-[var(--theme-border)] p-3 flex flex-col gap-3 backdrop-blur-2xl z-50 shadow-2xl md:hidden origin-top-right"
                  style={{ borderRadius: 'var(--theme-radius)', borderWidth: 'var(--theme-border-width)' }}
                >
                  {/* Mobile Toggle Labels */}
                  <button
                    type="button"
                    onClick={() => setLabelsOpaque(!labelsOpaque)}
                    className="w-full px-3 py-2.5 text-[10px] font-mono tracking-[0.15em] uppercase transition-all duration-150 border flex items-center justify-between"
                    style={{
                      borderColor: labelsOpaque ? 'var(--theme-primary)' : 'var(--theme-border)',
                      background: labelsOpaque ? 'rgba(229, 193, 88, 0.08)' : 'transparent',
                      color: labelsOpaque ? 'var(--theme-primary)' : 'var(--theme-text)',
                    }}
                  >
                    <span>{t.labelsControl}</span>
                    <span className="opacity-80">{labelsOpaque ? t.labelsVisible : t.labelsAuto}</span>
                  </button>

                  {/* Mobile Toggle Satellites */}
                  {useNaming && (
                    <button
                      type="button"
                      onClick={() => {
                        const nextVal = !showSatellites;
                        setShowSatellites(nextVal);
                        setUserPreferredShowSatellites(nextVal);
                        if (nextVal && (!satelliteBrandables[centerWord.toLowerCase()] || satelliteBrandables[centerWord.toLowerCase()].length === 0)) {
                          handleGenerateSatellites(centerWord);
                        }
                      }}
                      className="w-full px-3 py-2.5 text-[10px] font-mono tracking-[0.15em] uppercase transition-all duration-150 border flex items-center justify-between"
                      style={{
                        borderColor: showSatellites ? 'var(--theme-primary)' : 'var(--theme-border)',
                        background: showSatellites ? 'rgba(229, 193, 88, 0.08)' : 'transparent',
                        color: showSatellites ? 'var(--theme-primary)' : 'var(--theme-text)',
                      }}
                    >
                      <span>Focus</span>
                      <span className="opacity-80">{showSatellites ? 'Sats' : 'Sem'}</span>
                    </button>
                  )}

                  {/* Mobile Theme Toggle */}
                  <button
                    type="button"
                    onClick={() => setActiveTheme(prev => prev === 'AMBER' ? 'POETIC_LIGHT' : prev === 'POETIC_LIGHT' ? 'RAW_MINIMAL' : 'AMBER')}
                    className="w-full px-3 py-2.5 text-[10px] font-mono tracking-[0.15em] uppercase transition-all duration-150 border flex items-center justify-between border-[var(--theme-border)] text-[var(--theme-text)]"
                  >
                    <span>Theme</span>
                    <span className="opacity-80">{activeTheme === 'AMBER' ? t.themeAmber : activeTheme === 'POETIC_LIGHT' ? t.themeLight : t.themeRawMinimal}</span>
                  </button>

                  {/* Mobile Language Toggle */}
                  <button
                    type="button"
                    onClick={() => setLang(prev => prev === 'fr' ? 'en' : 'fr')}
                    className="w-full px-3 py-2.5 text-[10px] font-mono tracking-[0.15em] uppercase transition-all duration-150 border flex items-center justify-between border-[var(--theme-border)] text-[var(--theme-text)]"
                  >
                    <span>Lang</span>
                    <span className="opacity-80">{lang === 'fr' ? 'FR' : 'EN'}</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </header>
      )}

      {/* Header separator — removed for clarity */}


      {/* Error Toast */}
      <AnimatePresence>
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="fixed bottom-32 left-1/2 -translate-x-1/2 z-50 px-8 py-4 font-mono uppercase tracking-[0.3em] flex items-center gap-4"
            style={{
              background: 'var(--theme-bg)',
              border: '1px solid var(--theme-primary)',
              color: 'var(--theme-text)',
              fontSize: '10px',
              boxShadow: '0 0 30px rgba(245,166,35,0.15)',
            }}
          >
            <span style={{ color: 'var(--theme-primary)' }}>⚠</span>
            ERR: {errorMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer — Breadcrumb (visible when initialized) */}
      {initialized && (
        <footer className="w-full max-w-7xl mx-auto px-3 sm:px-8 pt-3 pb-[max(env(safe-area-inset-bottom),0.8rem)] flex flex-row justify-between items-center gap-3 z-20 font-mono"
          style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="flex items-center select-none min-w-0 flex-1 overflow-hidden">
            <div className="flex items-center gap-1 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {history.map((word, i) => (
                <div key={`${i}-${word}`} className="flex items-center gap-1 shrink-0">
                  <span
                    className="text-[10px] sm:text-[11px] tracking-[0.12em] whitespace-nowrap px-1.5 py-0.5 transition-all duration-200 font-bold cursor-pointer"
                    style={word.toLowerCase() === centerWord.toLowerCase()
                      ? { color: 'var(--theme-bg)', background: 'var(--theme-primary)', border: '1px solid var(--theme-primary)', boxShadow: '0 0 10px rgba(245,166,35,0.3)' }
                      : { color: 'var(--theme-text)', opacity: 0.5, border: '1px solid transparent' }
                    }
                    onClick={() => handleNavigateWord(word)}
                  >
                    {word}
                  </span>
                  {i < history.length - 1 && (
                    <span className="text-[9px] font-light select-none shrink-0"
                      style={{ color: 'var(--theme-primary)', opacity: 0.5 }}>·</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Dynamic status — right side */}
          <div
            className="flex flex-row items-center gap-3 shrink-0 text-[9px] sm:text-[10px] tracking-[0.15em] select-none app-details ml-auto"
            style={{ fontFamily: 'var(--app-font-body)' }}
          >
            {/* Status indicators moved to header */}
          </div>
        </footer>
      )}

      {/* Floating Map Labels unified in premium header control deck */}

      {/* Custom cursor */}
      {!isMobile && isFinePointer && (
        <>
          {/* Amber trail dots */}
          {[
            { x: trail1X, y: trail1Y, size: 4, opacity: 0.35 },
            { x: trail2X, y: trail2Y, size: 3, opacity: 0.2 },
            { x: trail3X, y: trail3Y, size: 2, opacity: 0.1 },
          ].map((dot, i) => (
            <motion.div
              key={i}
              className="cursor-trail"
              style={{ x: dot.x, y: dot.y, width: dot.size, height: dot.size, opacity: dot.opacity }}
            />
          ))}

          {/* Main cursor */}
          <motion.div
            className="pointer-events-none fixed top-0 left-0 z-[200] select-none hidden md:block -translate-x-1/2 -translate-y-1/2 mix-blend-difference"
            style={{ x: cursorX, y: cursorY }}
            variants={{
              default: { width: 12, height: 12, border: "1px solid #fff", backgroundColor: "transparent", borderRadius: "0%", opacity: 0.8 },
              pointer: { width: 28, height: 28, border: "1px solid var(--theme-primary)", backgroundColor: "var(--theme-primary)", borderRadius: "0%", opacity: 0.9 },
              text: { width: 1, height: 22, backgroundColor: "#fff", borderRadius: "0%", opacity: 1 },
            }}
            animate={cursorType}
            transition={{ type: "spring", damping: 35, stiffness: 500, mass: 0.3 }}
          />
        </>
      )}
    </div>
  );
}


