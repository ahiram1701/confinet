import { createAuthClient } from 'better-auth/react';

// Mismo origen: la API vive en /api (proxy de Vite en local, Pages Function en producción).
export const authClient = createAuthClient({ basePath: '/api/auth' });
