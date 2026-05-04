import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useSpring, useMotionValue, animate } from 'framer-motion';
import { ACTIVE_THEME, THEMES } from './theme';

export default function App() {
  const { scrollY } = useScroll();
  const smoothY = useSpring(scrollY, { damping: 15, stiffness: 100, restDelta: 0.001 });

  const currentTheme = THEMES[ACTIVE_THEME] || THEMES.POETIC;

  const backgroundColor = useTransform(smoothY, [0, 150], [currentTheme.colors.background, currentTheme.colors.backgroundScroll]);
  const color = useTransform(smoothY, [0, 150], [currentTheme.colors.text, currentTheme.colors.textScroll]);
  const resultColor = useTransform(smoothY, [0, 150], [currentTheme.colors.secondary, currentTheme.colors.primary]);

  // États pour le curseur sur mesure
  const cursorX = useMotionValue(0);
  const cursorY = useMotionValue(0);
  const [cursorType, setCursorType] = useState<'default' | 'pointer' | 'text'>('default');
  const inputRef = useRef<HTMLInputElement>(null);
  const [isTyping, setIsTyping] = useState(false);


  useEffect(() => {
    const updateCursor = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target) {
        // Proximité gravitationnelle du champ de saisie
        const inputEl = document.querySelector('input, textarea');
        let inProximity = false;
        if (inputEl) {
          const rect = inputEl.getBoundingClientRect();
          const dist = Math.hypot(
            e.clientX - (rect.left + rect.width / 2),
            e.clientY - (rect.top + rect.height / 2)
          );
          if (dist < 220) {
            inProximity = true;
          }
        }

        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.closest("input") || target.closest("textarea") || inProximity) {
          setCursorType('text');
        } else if (
          target.tagName === "BUTTON" ||
          target.tagName === "A" ||
          target.closest("a") ||
          target.closest("button") ||
          target.closest(".cursor-pointer") ||
          target.closest('[role="button"]')
        ) {
          setCursorType('pointer');
        } else {
          setCursorType('default');
        }
      }
    };

    const mouseMove = (e: MouseEvent) => {
      // Sortir du mode typing dès que l'utilisateur bouge la souris
      if (isTyping) setIsTyping(false);

      let magneticX = e.clientX;
      let magneticY = e.clientY;
      
      // Attraction gravitationnelle subtile vers le centre de l'input
      const inputEl = document.querySelector('input, textarea');
      if (inputEl) {
        const rect = inputEl.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const dist = Math.hypot(e.clientX - centerX, e.clientY - centerY);
        
        if (dist < 150) {
          magneticX = e.clientX + (centerX - e.clientX) * 0.15;
          magneticY = e.clientY + (centerY - e.clientY) * 0.15;
        }
      }

      cursorX.set(magneticX);
      cursorY.set(magneticY);
      updateCursor(e);
    };

    const mouseOver = (e: MouseEvent) => {
      updateCursor(e);
    };

    window.addEventListener("mousemove", mouseMove);
    window.addEventListener("mouseover", mouseOver);

    return () => {
      window.removeEventListener("mousemove", mouseMove);
      window.removeEventListener("mouseover", mouseOver);
    };
  }, []);

  const [adjective, setAdjective] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [submittedAdjective, setSubmittedAdjective] = useState('');

  // Suggérer des adjectifs par défaut
  const suggestions = ['Beau', 'Grand', 'Triste', 'Froid', 'Sombre', 'Léger'];

  // États pour l'effet typewriter
  const [placeholder, setPlaceholder] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);
  const [typingSpeed, setTypingSpeed] = useState(150);

  // Design Spell: Magnétisme du curseur sur le texte
  useEffect(() => {
    if (isTyping && inputRef.current) {
      const inputEl = inputRef.current;
      const rect = inputEl.getBoundingClientRect();
      const style = window.getComputedStyle(inputEl);
      const font = `${style.fontWeight || 'normal'} ${style.fontSize} ${style.fontFamily}`;
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      let textWidth = 0;
      if (context) {
        context.font = font;
        // On mesure la largeur du texte actuel (ou du placeholder)
        textWidth = context.measureText(inputEl.value || inputEl.placeholder).width;
      }
      
      // Position exacte du caret (le texte est centré)
      const snapX = rect.left + (rect.width / 2) + (textWidth / 2) + 2;
      const snapY = rect.top + (rect.height / 2);
      
      // Animation fluide vers la position du texte
      animate(cursorX, snapX, { type: "spring", damping: 25, stiffness: 250, mass: 0.5 });
      animate(cursorY, snapY, { type: "spring", damping: 25, stiffness: 250, mass: 0.5 });
      setCursorType('text');
    }
  }, [adjective, placeholder, isTyping, cursorX, cursorY]);

  useEffect(() => {
    if (adjective !== '') {
      setPlaceholder('');
      return;
    }

    const timer = setTimeout(() => {
      const currentWord = suggestions[wordIndex];

      if (!isDeleting) {
        setPlaceholder(currentWord.substring(0, placeholder.length + 1));
        setTypingSpeed(120);

        if (placeholder.length + 1 === currentWord.length) {
          setTypingSpeed(2000);
          setIsDeleting(true);
        }
      } else {
        setPlaceholder(currentWord.substring(0, placeholder.length - 1));
        setTypingSpeed(80);

        if (placeholder.length === 0) {
          setIsDeleting(false);
          setWordIndex((prev) => (prev + 1) % suggestions.length);
          setTypingSpeed(500);
        }
      }
    }, typingSpeed);

    return () => clearTimeout(timer);
  }, [placeholder, isDeleting, wordIndex, adjective]);

  // Appel de l'API avec streaming pour récupérer les alternatives
  const handleGenerate = async (presetWord?: string) => {
    const currentWord = suggestions[wordIndex];
    const wordToUse = presetWord || adjective || currentWord;
    if (!wordToUse.trim()) return;

    if (presetWord) {
      setAdjective(presetWord);
    } else if (!adjective) {
      setAdjective(currentWord);
    }

    setSubmittedAdjective(wordToUse);
    setLoading(true);
    setAiResponse('');

    const startTime = performance.now();
    const getTime = () => new Date().toLocaleTimeString();
    const elapsed = () => `${(performance.now() - startTime).toFixed(0)}ms`;

    console.log(`[App ${getTime()} - +0ms] ✉️ Envoi de la requête pour l'adjectif: "${wordToUse}"`);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: wordToUse }),
      });

      const modelUsed = response.headers.get('X-Model-Used') || 'Non spécifié';
      console.log(`[App ${getTime()} - +${elapsed()}] 🤖 Modèle utilisé par l'API: ${modelUsed}`);

      if (!response.body) {
        throw new Error('Aucun flux de streaming retourné.');
      }

      console.log(`[App ${getTime()} - +${elapsed()}] 📡 Début du streaming...`);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let firstTokenReceived = false;
      let lastToken = '';

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunkValue = decoder.decode(value);

        if (chunkValue) {
          if (!firstTokenReceived && chunkValue.trim().length > 0) {
            console.log(`[App ${getTime()} - +${elapsed()}] ⏱️ Premier token reçu: "${chunkValue.replace(/\n/g, '\\n')}"`);
            firstTokenReceived = true;
          }
          lastToken = chunkValue;
          setAiResponse((prev) => prev + chunkValue);
        }
      }

      if (lastToken) {
        console.log(`[App ${getTime()} - +${elapsed()}] 🏁 Dernier token reçu: "${lastToken.replace(/\n/g, '\\n')}"`);
      }
    } catch (error: any) {
      console.error(`[App ${getTime()} - +${elapsed()}] Erreur API:`, error);
      setAiResponse(`Erreur : ${error.message || 'Impossible de charger la réponse AI.'}`);
    } finally {
      setLoading(false);
    }
  };

  // Convertir le texte brut généré à la volée en un tableau d'alternatives
  const alternatives = aiResponse
    .trim()
    .split(/[|\n]/)
    .map((line) => line.trim())
    .filter((line) => {
      if (line.length === 0) return false;
      // Éviter les lignes de puces ou de numéros
      if (line.startsWith('-') || line.startsWith('—') || line.startsWith('*') || /^\d+\./.test(line)) return false;
      // Éviter les lignes qui ressemblent à de la réflexion ou à des phrases longues (ex: plus de 4 mots ou plus de 40 caractères)
      if (line.split(/\s+/).length > 4 || line.length > 40) return false;
      // Éviter les lignes contenant des mots de réflexion typiques ou préambules
      if (/split:|user wants|brainstorm|thinking|reflexion/i.test(line)) return false;
      return true;
    });

  // Inject Theme Variables
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
    backgroundColor,
    color,
    fontFamily: 'var(--theme-font-body)',
  } as any;

  return (
    <motion.div 
      className="min-h-screen w-full flex flex-col items-center px-6 py-16 md:px-16 md:py-24 transition-colors duration-1000 selection:bg-[var(--theme-primary)] selection:text-[var(--theme-bg)]"
      style={themeStyle}
    >
      {/* Header Poster */}
      <header className="mb-12 text-center select-none w-full max-w-4xl mx-auto">
        <motion.h1
          className="text-2xl md:text-5xl font-bold mb-4 text-center select-none leading-none drop-shadow-sm"
          style={{
            fontFamily: 'var(--theme-font-display)',
            textTransform: 'var(--theme-heading-transform)' as any,
            letterSpacing: 'var(--theme-heading-tracking)',
          }}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        >
          L'ADJECTIF
        </motion.h1>

        <motion.p
          className="text-[0.8rem] md:text-sm leading-[2] text-center max-w-2xl mx-auto opacity-70 mb-16"
          style={{
            fontFamily: 'var(--theme-font-body)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase'
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5, delay: 0.5 }}
        >
          Découvrez des alternatives pour enrichir et préciser votre vocabulaire.
        </motion.p>
      </header>

      {/* Input Textuel Editorial */}
      <motion.div
        className="w-full flex flex-col items-center p-6 sm:p-10 transition-all duration-500"
        style={{
          backgroundColor: 'var(--theme-card)',
          borderColor: 'var(--theme-border)',
          borderWidth: 'var(--theme-border-width)',
          borderRadius: 'var(--theme-radius)',
          boxShadow: 'var(--theme-shadow)',
          maxWidth: '1200px'
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, delay: 0.8 }}
      >
        <div className="relative w-full flex flex-col items-center gap-4">
          <motion.span
            className="text-center italic text-xl md:text-3xl lg:text-4xl select-none cursor-default block mb-2"
            style={{ opacity: 0.6, fontFamily: 'var(--theme-font-display)' }}
            animate={loading ? { opacity: [0.6, 0.3, 0.6] } : { opacity: 0.6 }}
            transition={loading ? { repeat: Infinity, duration: 1.5, ease: "easeInOut" } : { duration: 0.5 }}
          >
            Au lieu de très...
          </motion.span>
          <input
            ref={inputRef}
            type="text"
            className="w-full text-center focus:outline-none transition-all duration-700 placeholder:text-[var(--theme-placeholder)]"
            style={{
              backgroundColor: 'var(--theme-input)',
              fontSize: 'var(--theme-input-size)',
              fontFamily: 'var(--theme-font-display)',
              borderRadius: 'var(--theme-radius)',
              color: 'inherit',
              padding: '1rem',
              caretColor: 'transparent',
            }}
            placeholder={placeholder || ""}
            value={adjective}
            onChange={(e) => {
              setAdjective(e.target.value);
              setIsTyping(true);
            }}
            onKeyDown={(e) => {
              setIsTyping(true);
              if (e.key === 'Enter') handleGenerate();
            }}
            onClick={() => setIsTyping(true)}
            maxLength={30}
            autoFocus
          />
        </div>
      </motion.div>

      {/* Zone de résultats */}
      <div className="mt-8 w-full max-w-6xl mx-auto min-h-[300px] flex flex-col items-center justify-start">
        <AnimatePresence mode="wait">
          {aiResponse ? (
            <motion.div
              key="results"
              className="w-full flex flex-col items-center mt-12 md:mt-24"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
            >
              {alternatives.length > 0 && (
                <div className="flex flex-col items-center w-full">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 md:gap-x-20 gap-y-16 text-center w-full">
                    {alternatives.map((alt, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ scale: 1.05, translateY: -6 }}
                        style={{ 
                          color: resultColor,
                          fontSize: 'var(--theme-result-size)',
                          fontFamily: 'var(--theme-font-display)'
                        }}
                        transition={{ duration: 0.6, delay: index * 0.05 }}
                        className={`py-6 md:py-10 cursor-pointer tracking-normal font-normal leading-tight my-2 ${index % 2 === 1 ? 'md:mt-16 lg:mt-0' : 'md:mt-0'} ${index % 3 === 1 ? 'lg:mt-24' : 'lg:mt-0'}`}
                      >
                        {alt}
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {/* Premium Cursor */}
      <motion.div
        className="pointer-events-none fixed top-0 left-0 z-50 select-none hidden md:block -translate-x-1/2 -translate-y-1/2"
        style={{
          x: cursorX,
          y: cursorY,
          backgroundColor: 'var(--theme-primary)',
        }}
        variants={{
          default: {
            width: 12,
            height: 12,
            borderRadius: "50%",
            opacity: 0.6,
          },
          pointer: {
            width: 32,
            height: 32,
            borderRadius: "50%",
            opacity: 0.4,
          },
          text: {
            width: 4,
            height: 38,
            borderRadius: "2px",
            opacity: [0.35, 0.8, 0.35],
            transition: {
              opacity: {
                repeat: Infinity,
                duration: 1.2,
                ease: "easeInOut"
              }
            }
          },
        }}
        animate={cursorType}
        transition={{ type: "spring", damping: 30, stiffness: 350, mass: 0.5 }}
      />
    </motion.div>
  );
}

