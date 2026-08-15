import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Auth0Provider } from '@auth0/auth0-react';
import App from './App.tsx';
import './index.css';

const domain = import.meta.env.PUBLIC_VITE_AUTH0_DOMAIN || import.meta.env.VITE_AUTH0_DOMAIN || '';
const clientId = import.meta.env.PUBLIC_VITE_AUTH0_CLIENT_ID || import.meta.env.VITE_AUTH0_CLIENT_ID || '';

if (!domain || !clientId) {
  console.error('Auth0 configuration missing. Please add PUBLIC_VITE_AUTH0_DOMAIN and PUBLIC_VITE_AUTH0_CLIENT_ID to Vercel environment variables.');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: window.location.origin,
      }}
    >
      <App />
    </Auth0Provider>
  </StrictMode>,
);
