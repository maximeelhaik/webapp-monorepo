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



export default function App() {
  // --- CODE ORIGINAL POUR REVERT ---
  /*
  const [centerWord, setCenterWord] = useState('cosmos');
  const [relatedWords, setRelatedWords] = useState<string[]>(['infini', 'étoile', 'matière', 'vide', 'lumière', 'temps', 'espace', 'gravité']);
  const [history, setHistory] = useState<string[]>(['cosmos']);
  const [allNodesOnMap, setAllNodesOnMap] = useState<string[]>(['cosmos', 'infini', 'étoile', 'matière', 'vide', 'lumière', 'temps', 'espace', 'gravité']);
  const [parentsMap, setParentsMap] = useState<Record<string, string>>({
    'infini': 'cosmos', 'étoile': 'cosmos', 'matière': 'cosmos', 'vide': 'cosmos',
    'lumière': 'cosmos', 'temps': 'cosmos', 'espace': 'cosmos', 'gravité': 'cosmos'
  });
  const [edges, setEdges] = useState<Set<string>>(new Set([
    'cosmos|infini', 'cosmos|étoile', 'cosmos|matière', 'cosmos|vide',
    'cosmos|lumière', 'cosmos|temps', 'cosmos|espace', 'cosmos|gravité'
  ]));
  const [seeds, setSeeds] = useState<string[]>(['cosmos']);
  const [exploredCache, setExploredCache] = useState<Record<string, string[]>>({
    'cosmos': ['infini', 'étoile', 'matière', 'vide', 'lumière', 'temps', 'espace', 'gravité']
  });
  */

  // --- NOUVELLE IMPLEMENTATION DYNAMIQUE ---
  const [centerWord, setCenterWord] = useState('');
  const [relatedWords, setRelatedWords] = useState<string[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
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
  const [initialized, setInitialized] = useState(false);


  // Boot + UI states
  const [bootComplete, setBootComplete] = useState(false);
  const [amberFlash, setAmberFlash] = useState(false);

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
        if (target.tagName === 'INPUT' || target.closest('input')) {
          newType = 'text';
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

  // --- CODE ORIGINAL POUR REVERT ---
  /*
  const [casingMap, setCasingMap] = useState<Record<string, string>>({
    'cosmos': 'Cosmos', 'infini': 'Infini', 'étoile': 'Étoile', 'matière': 'Matière',
    'vide': 'Vide', 'lumière': 'Lumière', 'temps': 'Temps', 'espace': 'Espace', 'gravité': 'Gravité'
  });
  */

  // --- NOUVELLE IMPLEMENTATION ---
  const [casingMap, setCasingMap] = useState<Record<string, string>>({});

  // --- CODE ORIGINAL POUR REVERT ---
  /*
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

    // BFS pour trouver le chemin le plus court vers 'cosmos' (la racine absolue)
    const queue: [string, string[]][] = [['cosmos', ['cosmos']]];
    const visited = new Set<string>(['cosmos']);

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
      if (sLower === 'cosmos') continue;

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
  */

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

    const lowerNext = nextWord.toLowerCase();
    const lowerCenter = centerWord.toLowerCase();

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

    // Vérification du cache (insensible à la casse)
    if (exploredCache[lowerNext]) {
      console.log(`%c[Constellation] 🧠 Récupération depuis le cache : "${nextWord}"`, 'color: #10b981; font-weight: bold');
      setRelatedWords(exploredCache[lowerNext]);
      setInitialized(true); // Active l'interface 3D car les données sont prêtes
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
      // Uniquement si c'est une recherche et que le mot n'est pas sur la map
      const isAlreadyOnMap = allNodesOnMap.some(w => w.toLowerCase() === lowerNext);
      const shouldCheckConnect = isSearch; // On vérifie même si déjà présent pour "resserrer" le réseau

      if (shouldCheckConnect) {
        console.log(`%c[BRIDGE] 🛰️ Analyse de connexion pour "${nextWord}"...`, 'color: #f472b6; font-weight: bold;');
        console.log(`%c[BRIDGE] 📦 Mots en mémoire: [${allNodesOnMap.join(', ')}]`, 'color: #94a3b8; font-size: 10px;');
      }

      const generatePromise = fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: nextWord, app: 'constellation' }),
        signal: abortController.signal
      });

      const connectPromise = shouldCheckConnect ? (async () => {
        const body = {
          word: nextWord,
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
        } catch (err) {
          console.error("[BRIDGE ERROR]", err);
          return { connectedTo: null };
        }
      })() : Promise.resolve({ connectedTo: null });

      // On n'attend plus connectPromise pour lancer le stream de generate
      const response = await generatePromise;

      connectPromise.then(connectData => {
        if (connectData && connectData.connectedTo) {
          console.log(`%c[BRIDGE] 🌉 Connexion magique trouvée : "${nextWord}" <-> "${connectData.connectedTo}"`, 'color: #f472b6; font-weight: bold;');

          setForceConnectTo(connectData.connectedTo);

          setEdges(prev => {
            const next = new Set(prev);
            const pair = [nextWord.toLowerCase(), connectData.connectedTo.toLowerCase()].sort().join('|');
            next.add(pair);
            return next;
          });

          setParentsMap(prev => {
            const lowerTarget = nextWord.toLowerCase();
            const lowerParent = connectData.connectedTo.toLowerCase();

            // On ne définit le parent que si le mot n'en a pas et n'est pas le premier seed
            const firstSeed = seeds[0] ? seeds[0].toLowerCase() : '';
            if (!prev[lowerTarget] && lowerTarget !== firstSeed) {
              return { ...prev, [lowerTarget]: connectData.connectedTo };
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

          const parts = fullText.split(/[|\n]/);
          const wordsToDisplay = done ? parts : parts.slice(0, -1);

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
            setRelatedWords(finalWords);
            setInitialized(true); // Active l'affichage du graphe 3D dès que les premiers mots sont prêts

            setEdges(prev => {
              const next = new Set(prev);
              const lowerNextWord = nextWord.toLowerCase();
              finalWords.forEach(w => {
                const pair = [lowerNextWord, w.toLowerCase()].sort().join('|');
                next.add(pair);
              });
              return next;
            });

            // Mettre à jour parentsMap pour les nouveaux mots uniquement (visualisation 3D)
            setParentsMap(prev => {
              const nextParents = { ...prev };
              const lowerNextWord = nextWord.toLowerCase();

              const firstSeed = seeds[0] ? seeds[0].toLowerCase() : '';
              finalWords.forEach(w => {
                const lw = w.toLowerCase();
                if (lw !== firstSeed && lw !== lowerNextWord && !nextParents[lw]) {
                  nextParents[lw] = nextWord;
                }
              });
              return nextParents;
            });

            // Mettre à jour le casing map pour les related words aussi
            setCasingMap(prev => {
              const next = { ...prev };
              finalWords.forEach(w => {
                next[w.toLowerCase()] = w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
              });
              return next;
            });

            setAllNodesOnMap(prev => Array.from(new Set([...prev, ...finalWords, nextWord])));
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
      setErrorMessage(error.message || 'Lien rompu dans la constellation...');
      setTimeout(() => setErrorMessage(null), 4000);
    } finally {
      setLoading(false);
      // On garde lastFetchedWordRef pour éviter les rebonds immédiats si besoin
    }
  };


  const handleCustomJump = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputWord.trim()) return;
    handleNavigateWord(inputWord.trim(), true);
    setInputWord('');
  };

  const [activeTheme, setActiveTheme] = useState(ACTIVE_THEME);
  const currentTheme = THEMES[activeTheme] || THEMES.AMBER;

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
    '--theme-font-display': currentTheme.typography.display,
    '--theme-font-body': currentTheme.typography.body,
    '--theme-input-size': currentTheme.typography.inputSize,
    '--theme-result-size': currentTheme.typography.resultSize,
    '--theme-heading-transform': currentTheme.typography.headingTransform,
    '--theme-heading-tracking': currentTheme.typography.headingTracking,
    '--theme-radius': currentTheme.ui.borderRadius,
    '--theme-border-width': currentTheme.ui.borderWidth,
    '--theme-shadow': currentTheme.ui.boxShadow,
    '--theme-button-shadow': currentTheme.ui.buttonShadow,
    '--theme-scanline-opacity': activeTheme === 'AMBER' ? '0.015' : '0.003',
    '--theme-vignette-opacity': activeTheme === 'AMBER' ? '0.30' : '0.05',
    backgroundColor: 'var(--theme-bg)',
    color: 'var(--theme-text)',
    fontFamily: 'var(--theme-font-body)',
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
      <Constellation3DV2
        centerWord={centerWord}
        relatedWords={relatedWords}
        forceConnectTo={forceConnectTo}
        parentsMap={parentsMap}
        onWordClick={handleNavigateWord}
        isLoading={loading}
        nodeCount={allNodesOnMap.length}
        activeTheme={activeTheme}
      />

      <header className="w-full max-w-7xl mx-auto px-8 pt-8 pb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 z-20 pointer-events-none">
        <div className="pointer-events-auto">
          <h1
            className="font-bold tracking-[0.18em] leading-none select-none text-lunar"
            style={{ fontFamily: '"IBM Plex Mono", monospace', fontStyle: 'italic', fontSize: 'clamp(1.6rem, 3.5vw, 2.6rem)' }}
          >
            Lexical
            <span
              className="font-mono font-light ml-2 align-middle not-italic"
              style={{ fontSize: '0.35em', color: 'var(--theme-primary)', letterSpacing: '0.25em' }}
            >
              _v2.6
            </span>
          </h1>
          <div className="flex flex-col gap-0.5 mt-2">
            <p className="text-[10px] opacity-50 font-mono select-none tracking-widest uppercase">
              SEMANTIC.MAPPING.SYSTEM
            </p>
            <p className="text-[9px] font-mono tracking-widest select-none uppercase"
              style={{ color: 'var(--theme-primary)', opacity: 0.6 }}>
              COORD // [ {centerWord.toUpperCase()} ]
            </p>
            <button
              onClick={() => setActiveTheme(prev => prev === 'AMBER' ? 'POETIC_LIGHT' : 'AMBER')}
              className="mt-3 px-3 py-1.5 text-[9px] font-mono tracking-[0.2em] uppercase font-bold text-left hover:opacity-100 transition-all duration-150 rounded-none w-fit"
              style={{
                border: '1px solid var(--theme-primary)',
                background: 'var(--theme-card)',
                color: 'var(--theme-primary)',
                cursor: 'none'
              }}
            >
              MODE // {activeTheme === 'AMBER' ? 'GOLDEN CLAIR' : 'DARK AMBRE'}
            </button>
          </div>
        </div>

        <form onSubmit={handleCustomJump} className="relative flex items-center max-w-sm w-full pointer-events-auto">
          <div className="w-full flex items-center relative group">
            <input
              type="text"
              className="w-full pl-11 pr-5 py-3.5 rounded-none text-[12px] focus:outline-none transition-all duration-300 placeholder:tracking-[0.1em] tracking-[0.15em] font-mono uppercase"
              style={{
                background: 'var(--theme-card)',
                border: '1px solid ' + (inputWord ? 'var(--theme-primary)' : 'rgba(255,255,255,0.1)'),
                color: 'var(--theme-text)',
              }}
              placeholder="RECHERCHER UN CONCEPT..."
              value={inputWord}
              onChange={(e) => setInputWord(e.target.value)}
              maxLength={25}
            />
            <svg
              className="absolute left-4 w-4 h-4 transition-colors pointer-events-none"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
              style={{ stroke: inputWord ? 'var(--theme-primary)' : 'rgba(242,242,242,0.4)' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <button
              type="submit"
              className="px-6 py-3.5 text-[11px] font-mono tracking-widest uppercase transition-all duration-150 shrink-0 font-bold"
              style={{
                borderTop: '1px solid ' + (inputWord ? 'var(--theme-primary)' : 'rgba(255,255,255,0.1)'),
                borderBottom: '1px solid ' + (inputWord ? 'var(--theme-primary)' : 'rgba(255,255,255,0.1)'),
                borderRight: '1px solid ' + (inputWord ? 'var(--theme-primary)' : 'rgba(255,255,255,0.1)'),
                borderLeft: 'none',
                background: 'var(--theme-card)',
                color: 'var(--theme-primary)',
              }}
            >
              EXPLORER
            </button>
          </div>
        </form>
      </header>
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

              {/* Animated tech brackets around title */}
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.8 }}
                className="flex flex-col items-center gap-3 relative"
              >
                <div className="font-mono text-[9px] tracking-[0.4em] text-[var(--theme-primary)] opacity-50 uppercase mb-2">
                  SYS.READY // SEMANTIC.ENGINE
                </div>

                <h1
                  className="font-bold tracking-[0.25em] leading-none select-none font-display italic"
                  style={{ 
                    fontSize: 'clamp(2.8rem, 8vw, 5.5rem)',
                    fontFamily: '"IBM Plex Mono", monospace',
                    filter: 'drop-shadow(0 0 20px rgba(245, 166, 35, 0.2))',
                    color: 'var(--theme-text)'
                  }}
                >
                  Lexical
                  <span
                    className="font-mono font-light ml-2 align-middle not-italic text-[var(--theme-primary)]"
                    style={{ fontSize: '0.25em', letterSpacing: '0.2em' }}
                  >
                    _v2.6
                  </span>
                </h1>

                <p className="text-[11px] opacity-60 font-mono select-none tracking-[0.25em] max-w-lg leading-relaxed mt-2 uppercase">
                  Cartographie sémantique tridimensionnelle de la pensée artificielle
                </p>
              </motion.div>

              {/* Central Search Box */}
              <motion.form 
                layoutId="search-form"
                onSubmit={handleCustomJump} 
                className="w-full max-w-lg mt-6 pointer-events-auto relative z-10"
              >
                <div className="flex items-center relative group">
                  <input
                    type="text"
                    className="w-full pl-12 pr-5 py-4.5 rounded-none text-[13px] focus:outline-none transition-all duration-300 placeholder:tracking-[0.1em] tracking-[0.15em] font-mono uppercase"
                    style={{
                      background: 'var(--theme-card)',
                      border: '1px solid var(--theme-primary)',
                      color: 'var(--theme-text)',
                      boxShadow: '0 0 30px rgba(245, 166, 35, 0.05)'
                    }}
                    placeholder="ENTREZ UN CONCEPT POUR INITIALISER..."
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
                    className="px-8 py-4.5 text-[12px] font-mono tracking-widest uppercase transition-all duration-200 shrink-0 font-bold"
                    style={{
                      borderTop: '1px solid var(--theme-primary)',
                      borderBottom: '1px solid var(--theme-primary)',
                      borderRight: '1px solid var(--theme-primary)',
                      borderLeft: 'none',
                      background: 'var(--theme-primary)',
                      color: 'var(--theme-bg)',
                    }}
                  >
                    {loading ? 'CHARGEMENT...' : 'EXPLORER'}
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
                        <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-[var(--theme-primary)] ml-2">
                          CONNEXION EN COURS...
                        </p>
                      </div>
                      <p className="font-mono text-[8px] tracking-[0.2em] opacity-40 uppercase">
                        GÉNÉRATION DU RÉSEAU COGNITIF INITIAL
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="suggestions"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.7 }}
                      className="flex flex-wrap gap-2.5 justify-center max-w-md"
                    >
                      {['COSMOS', 'INTELLIGENCE', 'ALCHIMIE', 'MIND', 'CYBERSPACE'].map((word) => (
                        <button
                          key={word}
                          onClick={() => {
                            setInputWord(word);
                            handleNavigateWord(word, true);
                          }}
                          className="px-3 py-1 text-[9px] font-mono tracking-[0.15em] border border-dashed border-[var(--theme-primary)] border-opacity-30 hover:border-solid hover:border-opacity-100 text-[var(--theme-text)] opacity-60 hover:opacity-100 hover:text-[var(--theme-primary)] transition-all duration-150 rounded-none cursor-none"
                          style={{ background: 'transparent' }}
                        >
                          {word}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Subtle Theme Switcher on Intro Screen */}
              <button
                onClick={() => setActiveTheme(prev => prev === 'AMBER' ? 'POETIC_LIGHT' : 'AMBER')}
                className="mt-4 px-3 py-1.5 text-[9px] font-mono tracking-[0.2em] uppercase font-bold hover:opacity-100 transition-all duration-150 rounded-none cursor-none opacity-50 hover:opacity-80"
                style={{
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  background: 'var(--theme-card)',
                  color: 'var(--theme-primary)',
                }}
              >
                MODE // {activeTheme === 'AMBER' ? 'GOLDEN CLAIR' : 'DARK AMBRE'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header (visible when initialized) */}
      {initialized && (
        <header className="w-full max-w-7xl mx-auto px-8 pt-8 pb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 z-20 pointer-events-none">
          <div className="pointer-events-auto">
            <h1
              className="font-bold tracking-[0.18em] leading-none select-none"
              style={{ 
                fontFamily: '"IBM Plex Mono", monospace', 
                fontStyle: 'italic', 
                fontSize: 'clamp(1.6rem, 3.5vw, 2.6rem)',
                color: 'var(--theme-text)'
              }}
            >
              Lexical
              <span
                className="font-mono font-light ml-2 align-middle not-italic"
                style={{ fontSize: '0.35em', color: 'var(--theme-primary)', letterSpacing: '0.25em' }}
              >
                _v2.6
              </span>
            </h1>
            <div className="flex flex-col gap-0.5 mt-2">
              <p className="text-[10px] opacity-50 font-mono select-none tracking-widest uppercase">
                SEMANTIC.MAPPING.SYSTEM
              </p>
              <p className="text-[9px] font-mono tracking-widest select-none uppercase"
                style={{ color: 'var(--theme-primary)', opacity: 0.6 }}>
                COORD // [ {centerWord.toUpperCase()} ]
              </p>
              <button
                onClick={() => setActiveTheme(prev => prev === 'AMBER' ? 'POETIC_LIGHT' : 'AMBER')}
                className="mt-3 px-3 py-1.5 text-[9px] font-mono tracking-[0.2em] uppercase font-bold text-left hover:opacity-100 transition-all duration-150 rounded-none w-fit"
                style={{
                  border: '1px solid var(--theme-primary)',
                  background: 'var(--theme-card)',
                  color: 'var(--theme-primary)',
                  cursor: 'none'
                }}
              >
                MODE // {activeTheme === 'AMBER' ? 'GOLDEN CLAIR' : 'DARK AMBRE'}
              </button>
            </div>
          </div>

          {/* Header Search Form (animated via Framer Motion shared layoutId) */}
          <motion.form 
            layoutId="search-form"
            onSubmit={handleCustomJump} 
            className="relative flex items-center max-w-sm w-full pointer-events-auto"
          >
            <div className="w-full flex items-center relative group">
              <input
                type="text"
                className="w-full pl-11 pr-5 py-3.5 rounded-none text-[12px] focus:outline-none transition-all duration-300 placeholder:tracking-[0.1em] tracking-[0.15em] font-mono uppercase"
                style={{
                  background: 'var(--theme-card)',
                  border: '1px solid ' + (inputWord ? 'var(--theme-primary)' : 'rgba(255,255,255,0.1)'),
                  color: 'var(--theme-text)',
                }}
                placeholder="RECHERCHER UN CONCEPT..."
                value={inputWord}
                onChange={(e) => setInputWord(e.target.value)}
                maxLength={25}
              />
              <svg
                className="absolute left-4 w-4 h-4 transition-colors pointer-events-none"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
                style={{ stroke: inputWord ? 'var(--theme-primary)' : 'rgba(242,242,242,0.4)' }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <button
                type="submit"
                className="px-6 py-3.5 text-[11px] font-mono tracking-widest uppercase transition-all duration-150 shrink-0 font-bold"
                style={{
                  borderTop: '1px solid ' + (inputWord ? 'var(--theme-primary)' : 'rgba(255,255,255,0.1)'),
                  borderBottom: '1px solid ' + (inputWord ? 'var(--theme-primary)' : 'rgba(255,255,255,0.1)'),
                  borderRight: '1px solid ' + (inputWord ? 'var(--theme-primary)' : 'rgba(255,255,255,0.1)'),
                  borderLeft: 'none',
                  background: 'var(--theme-card)',
                  color: 'var(--theme-primary)',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'var(--theme-primary)';
                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--theme-bg)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'var(--theme-card)';
                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--theme-primary)';
                }}
              >
                EXPLORER
              </button>
            </div>
          </motion.form>
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
        <footer className="w-full max-w-7xl mx-auto px-8 py-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 z-20 font-mono"
          style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="flex items-center gap-5 select-none w-full overflow-hidden">
          <span className="text-[9px] tracking-[0.35em] uppercase font-bold shrink-0"
            style={{ color: 'var(--theme-text)', opacity: 0.6 }}>
            PATH
          </span>
          <div className="flex items-center gap-1 overflow-x-auto flex-1" style={{ scrollbarWidth: 'none' }}>
            {history.map((word, i) => (
              <div key={`${i}-${word}`} className="flex items-center gap-1">
                <span
                  className="text-[11px] tracking-[0.12em] whitespace-nowrap px-2 py-0.5 transition-all duration-200 font-bold cursor-pointer"
                  style={word.toLowerCase() === centerWord.toLowerCase()
                    ? { color: 'var(--theme-bg)', background: 'var(--theme-primary)', border: '1px solid var(--theme-primary)', boxShadow: '0 0 15px rgba(245,166,35,0.4)' }
                    : { color: 'var(--theme-text)', opacity: 0.5, border: '1px solid transparent' }
                  }
                  onClick={() => handleNavigateWord(word)}
                >
                  {word.toUpperCase()}
                </span>
                {i < history.length - 1 && (
                  <span className="text-[10px] font-light select-none shrink-0"
                    style={{ color: 'var(--theme-primary)', opacity: 0.7 }}>/</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Dynamic status — right side */}
        <div className="flex flex-col items-end gap-0.5 shrink-0 text-[9px] tracking-[0.25em] uppercase select-none">
          <span className={loading ? 'status-scanning' : (relatedWords.length > 0 ? 'status-loaded' : 'status-mapping')}>
            {loading ? 'SCANNING...' : (relatedWords.length > 0 ? 'LOADED' : 'MAPPING')}
          </span>
          <span className={amberFlash ? 'flash-amber' : ''} style={{ color: 'var(--theme-text)', opacity: 0.4 }}>
            NODES: {allNodesOnMap.length}
          </span>
          <span style={{ color: 'var(--theme-text)', opacity: 0.4 }}>
            DEPTH: {history.length}
          </span>
        </div>
      </footer>
      )}

      {/* Custom cursor */}
      {isFinePointer && (
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
              pointer: { width: 28, height: 28, border: "1px solid #F5A623", backgroundColor: "#F5A623", borderRadius: "0%", opacity: 0.9 },
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


