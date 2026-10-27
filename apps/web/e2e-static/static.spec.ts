import { expect, test } from '@playwright/test';

/** Codifica una página igual que la extensión (gzip + base64url en el fragmento). */
async function handoffUrl(page: import('@playwright/test').Page) {
  return page.evaluate(async () => {
    const url = 'https://www.rtve.es/noticias/20260920/informe/1.shtml';
    const text = Array.from({ length: 300 }, (_, i) => `palabra${i}`).join(' ');
    const req = {
      url,
      extracted: {
        url,
        title: 'El paro baja por tercer mes consecutivo',
        author: 'Redacción',
        publishedAt: '2026-09-20',
        text,
        wordCount: 300,
        links: ['https://www.ine.es/a', 'https://www.sepe.es/b', 'https://www.mites.gob.es/c'],
        adCount: 0,
        hasAboutPage: true,
        hasContactPage: true,
      },
    };
    const gz = await new Response(
      new Blob([JSON.stringify(req)]).stream().pipeThrough(new CompressionStream('gzip')),
    ).arrayBuffer();
    let bin = '';
    for (const b of new Uint8Array(gz)) bin += String.fromCharCode(b);
    const data = btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return `analizar#data=${data}`;
  });
}

test('analiza la página que envía la extensión, sin IA por defecto', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByTestId('static-note')).toBeVisible();

  await page.goto(await handoffUrl(page));
  await expect(page).toHaveURL(/\/confinet\/resultado\//);
  await expect(page.getByText('Desglose')).toBeVisible();
  await expect(page.getByText(/no has elegido proveedor/)).toBeVisible();
  await expect(page.getByRole('link', { name: /Avísanos en GitHub/ })).toHaveAttribute(
    'href',
    /github\.com\/ahiram1701\/confinet\/issues\/new/,
  );

  // El historial queda en el navegador, sin cuenta.
  await page.goto('historial');
  await expect(page.getByText('El paro baja por tercer mes consecutivo')).toBeVisible();

  // Recargar una ruta interna funciona en GitHub Pages gracias a 404.html.
  await page.reload();
  await expect(page.getByText('El paro baja por tercer mes consecutivo')).toBeVisible();
});

test('la cuenta muestra que no hay ningún proveedor de IA elegido', async ({ page }) => {
  await page.goto('cuenta');
  await expect(page.getByTestId('ai-current')).toContainText('Ninguno');
  await page.getByLabel('Ollama Cloud').check();
  await expect(page.getByLabel('API key de Ollama')).toBeVisible();
  // Sin modelo no se puede guardar.
  await page.getByLabel('API key de Ollama').fill('clave-de-prueba');
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByTestId('ai-current')).toContainText('Ninguno');
});
