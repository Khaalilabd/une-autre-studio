import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { installFonts } from './lib/fonts';
import './styles.css';
import './experience.css';

// Fonts are local and loaded before the first render so text measurement is exact.
installFonts().finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
