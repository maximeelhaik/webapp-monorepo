export type ThemeConfig = {
  id: string;
  colors: {
    background: string;
    backgroundScroll: string;
    text: string;
    textScroll: string;
    primary: string;
    secondary: string;
    card: string;
    input: string;
    border: string;
    placeholder: string;
    caret: string;
  };
  typography: {
    display: string;
    body: string;
    inputSize: string;
    resultSize: string;
    headingTransform: 'uppercase' | 'none' | 'lowercase' | 'capitalize';
    headingTracking: string;
  };
  ui: {
    borderRadius: string;
    borderWidth: string;
    boxShadow: string;
    buttonShadow: string;
  };
};

export const THEMES: Record<string, ThemeConfig> = {
  POETIC: {
    id: 'POETIC',
    colors: {
      background: '#d5cfc1',
      backgroundScroll: '#1a1a1a',
      text: '#2b2421',
      textScroll: '#d5cfc1',
      primary: '#bfa15f',
      secondary: '#8c6d31',
      card: 'transparent',
      input: 'transparent',
      border: 'transparent',
      placeholder: '#8c817a',
      caret: '#a3958c',
    },
    typography: {
      display: '"Elegane", serif',
      body: '"Montserrat", sans-serif',
      inputSize: 'clamp(1.8rem, 6vw, 10rem)',
      resultSize: 'clamp(1.5rem, 4vw, 6rem)',
      headingTransform: 'uppercase',
      headingTracking: '0.5em',
    },
    ui: {
      borderRadius: '0px',
      borderWidth: '0px',
      boxShadow: 'none',
      buttonShadow: 'none',
    }
  },
  BRUTALIST: {
    id: 'BRUTALIST',
    colors: {
      background: '#E3DCD1',
      backgroundScroll: '#c4bcb0',
      text: '#1A1B1F',
      textScroll: '#1A1B1F',
      primary: '#FF57D9',
      secondary: '#6634D9',
      card: '#ffffff',
      input: '#ffffff',
      border: '#1A1B1F',
      placeholder: '#8c857c',
      caret: '#b8a698',
    },
    typography: {
      display: '"Montserrat", sans-serif',
      body: '"Montserrat", sans-serif',
      inputSize: 'clamp(2rem, 5vw, 4rem)',
      resultSize: 'clamp(1.5rem, 3vw, 2.5rem)',
      headingTransform: 'uppercase',
      headingTracking: 'normal',
    },
    ui: {
      borderRadius: '0px',
      borderWidth: '4px',
      boxShadow: '8px 8px 0px 0px rgba(26,27,31,1)',
      buttonShadow: '4px 4px 0px 0px rgba(26,27,31,1)',
    }
  },
  SLEEK: {
    id: 'SLEEK',
    colors: {
      background: '#0f172a',
      backgroundScroll: '#020617',
      text: '#f8fafc',
      textScroll: '#e2e8f0',
      primary: '#6366f1',
      secondary: '#a5b4fc',
      card: 'rgba(30, 41, 59, 0.4)',
      input: 'rgba(15, 23, 42, 0.6)',
      border: 'rgba(51, 65, 85, 0.6)',
      placeholder: '#64748b',
      caret: '#94a3b8',
    },
    typography: {
      display: 'system-ui, -apple-system, sans-serif',
      body: 'system-ui, -apple-system, sans-serif',
      inputSize: 'clamp(2rem, 4vw, 3.5rem)',
      resultSize: 'clamp(1.2rem, 2.5vw, 2rem)',
      headingTransform: 'none',
      headingTracking: 'tight',
    },
    ui: {
      borderRadius: '16px',
      borderWidth: '1px',
      boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)',
      buttonShadow: '0 4px 14px 0 rgba(99, 102, 241, 0.39)',
    }
  },
  AMBER: {
    id: 'AMBER',
    colors: {
      background: '#02040A', // Ultra-deep midnight abyss
      backgroundScroll: '#060914',
      text: '#F1F5F9',       // Bright starlight text
      textScroll: '#F1F5F9',
      primary: '#7DD3FC',    // Glowing ethereal sky blue
      secondary: '#475569',  // Muted slate-grey nebula
      card: 'rgba(15, 23, 42, 0.5)', // Premium nocturnal glass
      input: '#060914',
      border: 'rgba(125, 211, 252, 0.15)', // Subtly luminous border
      placeholder: '#64748B',
      caret: '#FBBF24',      // Vivid amber core
    },
    typography: {
      display: '"Space Mono", monospace', // Premium aesthetic alignment
      body: '"Plus Jakarta Sans", sans-serif',
      inputSize: 'clamp(2rem, 5vw, 4rem)',
      resultSize: 'clamp(1.5rem, 3vw, 2.5rem)',
      headingTransform: 'uppercase',
      headingTracking: '0.3em',
    },
    ui: {
      borderRadius: '0px',
      borderWidth: '1px',
      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6), 0 0 30px rgba(56, 189, 248, 0.03)', // Luminescent depth
      buttonShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
    }
  },
  RAW_MINIMAL: {
    id: 'RAW_MINIMAL',
    colors: {
      background: '#000000',
      backgroundScroll: '#050505',
      text: '#ffffff',
      textScroll: '#ffffff',
      primary: '#ffffff',
      secondary: '#666666', // Slightly cleaner semantic secondary
      card: 'rgba(255, 255, 255, 0.07)', // Ultra-thin premium frost
      input: '#000000',
      border: 'rgba(255, 255, 255, 0.1)', // Crisp architectural white border
      placeholder: '#525252',
      caret: '#ffffff',
    },
    typography: {
      display: '"Space Mono", monospace',
      body: '"Plus Jakarta Sans", sans-serif',
      inputSize: 'clamp(2rem, 5vw, 4rem)',
      resultSize: 'clamp(1.5rem, 3vw, 2.5rem)',
      headingTransform: 'uppercase',
      headingTracking: '0.3em', // Standardized luxury spacing
    },
    ui: {
      borderRadius: '0px',
      borderWidth: '1px',
      boxShadow: 'none', // Strictly raw
      buttonShadow: 'none', // Strictly raw
    }
  },
  POETIC_LIGHT: {
    id: 'POETIC_LIGHT',
    colors: {
      background: '#F6F6F8', // Premium lunar/magnesium white
      backgroundScroll: '#ECECED',
      text: '#0E0E10',       // Deep carbon for rich contrast
      textScroll: '#0E0E10',
      primary: '#000000',    // Solid black primary anchor
      secondary: '#6B6B76',  // Refined tertiary taupe-grey
      card: 'rgba(255, 255, 255, 0.7)', // Enhanced glassmorphism base
      input: 'rgba(255, 255, 255, 0.9)',
      border: 'rgba(14, 14, 16, 0.08)', // Ultra-thin translucent borders
      placeholder: '#A1A1AA',
      caret: '#000000',
    },
    typography: {
      display: '"DM Mono", monospace',
      body: '"Schibsted Grotesk", sans-serif',
      inputSize: 'clamp(2rem, 5vw, 4rem)',
      resultSize: 'clamp(1.5rem, 3vw, 2.5rem)',
      headingTransform: 'uppercase',
      headingTracking: '0.3em', // High-end letter spacing
    },
    ui: {
      borderRadius: '0px',
      borderWidth: '1px',
      boxShadow: '0 20px 40px rgba(0,0,0,0.03), 0 1px 3px rgba(0,0,0,0.02)', // Antigravity weightless effect
      buttonShadow: '0 4px 12px rgba(0,0,0,0.04)',
    }
  }
};

export type ThemeType = keyof typeof THEMES;

