import '@confinet/ui/styles.css';
import './app.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { Layout } from './Layout';
import { AnalyzePage } from './pages/AnalyzePage';
import { HistoryPage } from './pages/HistoryPage';
import { ResultPage } from './pages/ResultPage';
import { HandoffPage } from './pages/HandoffPage';
import { SharePage } from './pages/SharePage';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

// Las páginas secundarias se cargan bajo demanda para que la primera carga en móvil sea ligera.
const router = createBrowserRouter(
  [
    {
      element: <Layout />,
      children: [
        { path: '/', element: <AnalyzePage /> },
        { path: '/compartir', element: <SharePage /> },
        { path: '/analizar', element: <HandoffPage /> },
        { path: '/resultado/:id', element: <ResultPage /> },
        { path: '/historial', element: <HistoryPage /> },
        {
          path: '/cuenta',
          lazy: () => import('./pages/AccountPage').then((m) => ({ Component: m.AccountPage })),
        },
        {
          path: '/conectar-extension',
          lazy: () =>
            import('./pages/ConnectExtensionPage').then((m) => ({
              Component: m.ConnectExtensionPage,
            })),
        },
        {
          path: '/admin',
          lazy: () => import('./pages/AdminPage').then((m) => ({ Component: m.AdminPage })),
        },
        {
          path: '/privacidad',
          lazy: () => import('./pages/LegalPages').then((m) => ({ Component: m.PrivacyPage })),
        },
        {
          path: '/terminos',
          lazy: () => import('./pages/LegalPages').then((m) => ({ Component: m.TermsPage })),
        },
      ],
    },
  ],
  // En GitHub Pages la app vive en /confinet/ (VITE_BASE); en local y Cloudflare, en /.
  { basename: import.meta.env.BASE_URL.replace(/\/$/, '') || '/' },
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
