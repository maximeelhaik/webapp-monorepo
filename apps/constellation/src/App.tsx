import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion';
import Constellation3DV2 from './components/Constellation3DV2';

// Boot sequence lines
const BOOT_LINES = [
  { cls: 'boot-line boot-line-1', text: 'CONSTELLATION OS v2.6' },
  { cls: 'boot-line boot-line-2', text: 'LOADING SEMANTIC ENGINE...' },
  { cls: 'boot-line boot-line-3', text: 'MAPPING SYSTEM: READY' },
  { cls: 'boot-line boot-line-4', text: '▶ ENTER' },
];

export default function App() {
  const [centerWord, setCenterWord] = useState('cosmos');
  const [relatedWords, setRelatedWords] = useState<string[]>(['infini', 'étoile', 'matière', 'vide', 'lumière', 'temps', 'espace', 'gravité']);
  const [history, setHistory] = useState<string[]>(['cosmos']);
  const [loading, setLoading] = useState(false);
  const [inputWord, setInputWord] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [allNodesOnMap, setAllNodesOnMap] = useState<string[]>(['cosmos', 'infini', 'étoile', 'matière', 'vide', 'lumière', 'temps', 'espace', 'gravité']);
  const [parentsMap, setParentsMap] = useState<Record<string, string>>({
    'infini': 'cosmos', 'étoile': 'cosmos', 'matière': 'cosmos', 'vide': 'cosmos', 
    'lumière': 'cosmos', 'temps': 'cosmos', 'espace': 'cosmos', 'gravité': 'cosmos'
  });
  const [edges, setEdges] = useState<Set<string>>(new Set([
    'cosmos|infini', 'cosmos|étoile', 'cosmos|matière', 'cosmos|vide', 
    'cosmos|lumière', 'cosmos|temps', 'cosmos|espace', 'cosmos|gravité'
  ])); // Stocke "word1|word2" (trié)
  const [seeds, setSeeds] = useState<string[]>(['cosmos']); // Racines des clusters
  const [forceConnectTo, setForceConnectTo] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastFetchedWordRef = useRef<string | null>(null);

  // Cache pour éviter de re-fetch les mots déjà explorés
  const [exploredCache, setExploredCache] = useState<Record<string, string[]>>({
    'cosmos': ['infini', 'étoile', 'matière', 'vide', 'lumière', 'temps', 'espace', 'gravité']
  });


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

    // Helper to get consistent casing
    const [casingMap, setCasingMap] = useState<Record<string, string>>({ 
      'cosmos': 'Cosmos', 'infini': 'Infini', 'étoile': 'Étoile', 'matière': 'Matière', 
      'vide': 'Vide', 'lumière': 'Lumière', 'temps': 'Temps', 'espace': 'Espace', 'gravité': 'Gravité' 
    });

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
        
        // 1. Si déjà dans le fil d'ariane, on tronque (comportement naturel)
        const existingIndex = lowerPath.indexOf(lowerNext);
        if (existingIndex !== -1) {
          return prev.slice(0, existingIndex + 1);
        }

        // 2. On calcule le chemin le plus court réel via les edges
        const path = getShortestPath(nextWord);
        
        // 3. Sécurité : On vérifie si le chemin trouvé est "mieux" que d'ajouter simplement au bout
        // Si on vient d'un clic sur un noeud lié au centre actuel, on peut tenter de prolonger
        // MAI le user veut "recalculé meme quand on clic à l'opposé", donc le BFS est prioritaire.
        return path;
      });

      // Mettre à jour la map des casses pour le fil d'ariane
      setCasingMap(prev => ({ ...prev, [nextWord.toLowerCase()]: nextWord }));

      setCenterWord(nextWord);
      setForceConnectTo(null); // Reset par défaut

      // On l'ajoute immédiatement à la liste des mots sur la map
      setAllNodesOnMap(prev => Array.from(new Set([...prev, nextWord])));

    // Vérification du cache (insensible à la casse)
    if (exploredCache[lowerNext]) {
      console.log(`%c[Constellation] 🧠 Récupération depuis le cache : "${nextWord}"`, 'color: #10b981; font-weight: bold');
      setRelatedWords(exploredCache[lowerNext]);
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
            
            // On ne définit le parent que si le mot n'en a pas
            if (!prev[lowerTarget] && lowerTarget !== 'cosmos') {
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
              
              finalWords.forEach(w => {
                const lw = w.toLowerCase();
                if (lw !== 'cosmos' && lw !== lowerNextWord && !nextParents[lw]) {
                  nextParents[lw] = nextWord;
                }
              });
              return nextParents;
            });

            // Mettre à jour le casing map pour les related words aussi
            setCasingMap(prev => {
              const next = { ...prev };
              finalWords.forEach(w => {
                next[w.toLowerCase()] = w;
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

  return (
    <div
      className="min-h-[100dvh] w-full relative overflow-hidden bg-black text-lunar flex flex-col justify-between selection:bg-amber selection:text-black"
      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
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
            className="fixed inset-0 z-[300] bg-void flex flex-col justify-center items-start px-12 gap-3"
          >
            {BOOT_LINES.map((line) => (
              <p
                key={line.text}
                className={`${line.cls} font-mono text-[11px] tracking-[0.3em] uppercase`}
                style={{ color: line.cls.includes('boot-line-4') ? 'var(--c-amber)' : 'rgba(242,242,242,0.7)' }}
              >
                {line.text}
              </p>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3D Constellation Layer */}
      <Constellation3DV2
        centerWord={centerWord}
        relatedWords={relatedWords}
        forceConnectTo={forceConnectTo}
        parentsMap={parentsMap}
        onWordClick={handleNavigateWord}
        isLoading={loading}
        nodeCount={allNodesOnMap.length}
      />

      {/* Header */}
      <header className="w-full max-w-7xl mx-auto px-8 pt-8 pb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 z-20 pointer-events-none">
        <div className="pointer-events-auto">
          <h1
            className="font-bold tracking-[0.18em] uppercase leading-none select-none text-lunar"
            style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 'clamp(1.6rem, 3.5vw, 2.6rem)' }}
          >
            CONSTELLATION
            <span
              className="font-mono font-light ml-2 align-middle"
              style={{ fontSize: '0.35em', color: 'var(--c-amber)', letterSpacing: '0.25em' }}
            >
              _v2.6
            </span>
          </h1>
          <div className="flex flex-col gap-0.5 mt-2">
            <p className="text-[10px] text-lunar/50 font-mono select-none tracking-widest uppercase">
              SEMANTIC.MAPPING.SYSTEM
            </p>
            <p className="text-[9px] font-mono tracking-widest select-none uppercase"
               style={{ color: 'var(--c-amber)', opacity: 0.6 }}>
              COORD // [ {centerWord.toUpperCase()} ]
            </p>
          </div>
        </div>

        {/* Input with scan animation */}
        <form onSubmit={handleCustomJump} className="relative flex items-center max-w-sm w-full pointer-events-auto">
          <div className="input-scan-wrapper w-full flex items-center">
            <input
              type="text"
              className="w-full px-5 py-3.5 rounded-none text-[12px] focus:outline-none transition-colors duration-300 placeholder:tracking-[0.15em] tracking-[0.15em] font-mono uppercase"
              style={{
                background: 'var(--c-surface)',
                border: '1px solid var(--c-lunar-10)',
                color: 'var(--c-lunar)',
              }}
              placeholder="SCAN_INPUT_..."
              value={inputWord}
              onChange={(e) => setInputWord(e.target.value)}
              maxLength={25}
            />
            <button
              type="submit"
              className="px-4 py-3.5 text-[11px] font-mono tracking-widest uppercase transition-all duration-150 shrink-0"
              style={{
                border: '1px solid var(--c-lunar-10)',
                borderLeft: 'none',
                background: 'var(--c-surface)',
                color: 'var(--c-amber)',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--c-amber)';
                (e.currentTarget as HTMLButtonElement).style.color = '#000';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--c-surface)';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--c-amber)';
              }}
            >
              EXEC_▶
            </button>
          </div>
        </form>
      </header>

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
              background: 'var(--c-void)',
              border: '1px solid var(--c-amber)',
              color: 'var(--c-lunar)',
              fontSize: '10px',
              boxShadow: '0 0 30px rgba(245,166,35,0.15)',
            }}
          >
            <span style={{ color: 'var(--c-amber)' }}>⚠</span>
            ERR: {errorMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer — Breadcrumb */}
      <footer className="w-full max-w-7xl mx-auto px-8 py-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 z-20 font-mono"
        style={{ borderTop: '1px solid var(--c-lunar-10)' }}>
        <div className="flex items-center gap-5 select-none w-full overflow-hidden">
          <span className="text-[9px] tracking-[0.35em] uppercase font-bold shrink-0"
                style={{ color: 'var(--c-lunar-60)' }}>
            PATH
          </span>
          <div className="flex items-center gap-1 overflow-x-auto flex-1" style={{ scrollbarWidth: 'none' }}>
            {history.map((word, i) => (
              <div key={`${i}-${word}`} className="flex items-center gap-1">
                <span
                  className="text-[11px] uppercase tracking-[0.12em] whitespace-nowrap px-2 py-0.5 transition-all duration-200 font-bold"
                  style={word.toLowerCase() === centerWord.toLowerCase()
                    ? { color: '#000', background: 'var(--c-amber)', border: '1px solid var(--c-amber)', boxShadow: '0 0 15px rgba(245,166,35,0.4)' }
                    : { color: 'var(--c-lunar-30)', border: '1px solid transparent' }
                  }
                  onClick={() => handleNavigateWord(word)}
                >
                  {word.toLowerCase() === centerWord.toLowerCase() ? `[${word}]` : word}
                </span>
                {i < history.length - 1 && (
                  <span className="text-[10px] font-light select-none shrink-0"
                        style={{ color: 'var(--c-amber)', opacity: 0.7 }}>/</span>
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
          <span className={amberFlash ? 'flash-amber' : ''} style={{ color: 'var(--c-lunar-30)' }}>
            NODES: {allNodesOnMap.length}
          </span>
          <span style={{ color: 'var(--c-lunar-30)' }}>
            DEPTH: {history.length}
          </span>
        </div>
      </footer>

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
              default:  { width: 12, height: 12, border: "1px solid #fff", backgroundColor: "transparent", borderRadius: "0%", opacity: 0.8 },
              pointer:  { width: 28, height: 28, border: "1px solid #F5A623", backgroundColor: "#F5A623", borderRadius: "0%", opacity: 0.9 },
              text:     { width: 1,  height: 22, backgroundColor: "#fff", borderRadius: "0%", opacity: 1 },
            }}
            animate={cursorType}
            transition={{ type: "spring", damping: 35, stiffness: 500, mass: 0.3 }}
          />
        </>
      )}
    </div>
  );
}


