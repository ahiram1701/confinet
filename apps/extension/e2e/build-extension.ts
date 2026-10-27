import { execSync } from 'node:child_process';

/** Compila la build de pruebas apuntando a la PWA estática local. */
export default function buildExtension() {
  execSync('pnpm exec wxt build', {
    stdio: 'inherit',
    env: {
      ...process.env,
      WXT_E2E: 'true',
      WXT_BACKEND: 'static',
      WXT_APP_URL: 'http://localhost:4174/confinet',
    },
  });
}
