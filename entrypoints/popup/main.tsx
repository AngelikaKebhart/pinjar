import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from '@/src/components/ThemeProvider';
import { TranslationProvider } from '@/src/i18n/TranslationProvider';
import App from './App.tsx';
import '@/assets/tailwind.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <TranslationProvider>
        <App />
      </TranslationProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
