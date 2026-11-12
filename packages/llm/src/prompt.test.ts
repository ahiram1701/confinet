import { describe, expect, it } from 'vitest';
import { buildInstructions } from './prompt';

describe('buildInstructions', () => {
  it('pide el resumen en el idioma de la interfaz', () => {
    expect(buildInstructions('en')).toContain('en inglés (English)');
    expect(buildInstructions('es')).toContain('en español');
    expect(buildInstructions()).toBe(buildInstructions('es'));
  });

  it('las citas se mantienen en el idioma del artículo', () => {
    expect(buildInstructions('en')).toMatch(/citas literales .* idioma del artículo/);
  });
});
