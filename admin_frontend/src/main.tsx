import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { AuthProvider } from './contexts/AuthContext'

// Set up runtime override for leave API before dynamically importing app modules
try {
  const viteLeave = (import.meta as any)?.env?.VITE_LEAVE_API_BASE_URL as string | undefined;
  if (viteLeave) {
    (globalThis as any).__VITE_LEAVE_API_BASE_URL = viteLeave;
  }
  // eslint-disable-next-line no-console
  console.debug('[main] import.meta.env.VITE_LEAVE_API_BASE_URL=', viteLeave);
} catch (e) {
  // ignore in environments where import.meta isn't available
}

async function bootstrap() {
  const root = createRoot(document.getElementById('root')!);
  const { default: App } = await import('./App');
  root.render(
    <StrictMode>
      <AuthProvider>
        <App />
      </AuthProvider>
    </StrictMode>,
  );
}

// Start the app
// eslint-disable-next-line @typescript-eslint/no-floating-promises
bootstrap();
