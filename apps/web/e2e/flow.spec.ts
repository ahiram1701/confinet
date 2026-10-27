import { expect, test } from '@playwright/test';

// El análisis descarga la página real y consulta RDAP: puede tardar varios segundos.
const RESULT = { timeout: 20_000 };

test('analiza un enlace sin cuenta', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Enlace a analizar').fill('example.com');
  await page.getByRole('button', { name: 'Analizar' }).click();

  await expect(page).toHaveURL(/\/resultado\//, RESULT);
  await expect(page.getByText('Desglose')).toBeVisible();
  await expect(page.getByText('Fuente', { exact: false }).first()).toBeVisible();
});

test('el destino de "Compartir" extrae el enlace del texto', async ({ page }) => {
  await page.goto('/compartir?text=' + encodeURIComponent('Mira esto https://example.org/ 😮'));
  await expect(page).toHaveURL(/\/resultado\//, RESULT);
});

test('inicia sesión, analiza y aparece en el historial', async ({ page }, testInfo) => {
  const email = `e2e-${testInfo.project.name}-${Date.now()}@confinet.test`;

  await page.goto('/cuenta');
  const form = page.getByTestId('dev-login');
  await form.getByPlaceholder('email').fill(email);
  await form.getByPlaceholder(/contraseña/).fill('contraseña-de-prueba-e2e');
  await form.getByRole('button', { name: /Entrar/ }).click();
  await expect(page.getByText(email)).toBeVisible();

  await page.goto('/');
  await page.getByLabel('Enlace a analizar').fill('https://example.com/');
  await page.getByRole('button', { name: 'Analizar' }).click();
  await expect(page).toHaveURL(/\/resultado\//, RESULT);

  await page.goto('/historial');
  await expect(page.getByText('example.com').first()).toBeVisible();
});
