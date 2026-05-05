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
  }
};

export type ThemeType = keyof typeof THEMES;
