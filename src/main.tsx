import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/700.css';
import './styles.css';
import App from './App';
import { StoreProvider } from './lib/store';
import { NavProvider } from './lib/nav';
import { ToastProvider } from './components/ui';
import { UiProvider, useUi } from './lib/i18n';

// Changer de langue re-rend toute l'app (les feuilles ouvertes restent dans la pile)
function Root() {
  const { lang } = useUi();
  return <App key={lang} />;
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <UiProvider>
      <ToastProvider>
        <StoreProvider>
          <NavProvider>
            <Root />
          </NavProvider>
        </StoreProvider>
      </ToastProvider>
    </UiProvider>
  </React.StrictMode>,
);
