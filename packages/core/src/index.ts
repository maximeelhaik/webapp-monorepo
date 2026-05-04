import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

export * from "./theme";

export function initReactApp(AppComponent: React.ComponentType) {
  createRoot(document.getElementById('root')!).render(
    React.createElement(StrictMode, null, React.createElement(AppComponent))
  );
}

