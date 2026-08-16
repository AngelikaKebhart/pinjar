import React from 'react';
import ReactDOM from 'react-dom/client';
import { TranslationProvider } from '@/src/i18n/TranslationProvider';
import App from './App.tsx';
import '@/assets/tailwind.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TranslationProvider>
      <App />
    </TranslationProvider>
  </React.StrictMode>,
);
