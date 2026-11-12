import { describe, expect, it } from 'vitest';
import { en } from './en';
import { es } from './es';
import { AppError, detectLocale, translate } from './index';

describe('diccionarios', () => {
  it('inglés y español tienen exactamente las mismas claves', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(es).sort());
  });

  it('cada traducción usa los mismos parámetros que el original', () => {
    const params = (m: unknown) =>
      [...JSON.stringify(m).matchAll(/\{(\w+)\}/g)].map((x) => x[1]).sort();
    for (const key of Object.keys(es) as (keyof typeof es)[]) {
      expect(params(en[key]), key).toEqual(params(es[key]));
    }
  });
});

describe('translate', () => {
  it('interpola parámetros', () => {
    expect(translate('es', 'signal.content.author.yes', { author: 'Ana' })).toBe(
      'El artículo está firmado por "Ana".',
    );
    expect(translate('en', 'signal.content.author.yes', { author: 'Ana' })).toBe(
      'The article is signed by "Ana".',
    );
  });

  it('elige singular o plural con n', () => {
    expect(translate('es', 'signal.content.citations.some', { n: 1 })).toBe(
      'Enlaza a 1 fuente externa.',
    );
    expect(translate('en', 'signal.content.citations.some', { n: 3 })).toBe(
      'Links to 3 external sources.',
    );
  });

  it('AppError lleva la clave y el texto en español', () => {
    const e = new AppError('cap.debunked');
    expect(e.key).toBe('cap.debunked');
    expect(e.message).toBe(es['cap.debunked']);
  });
});

describe('detectLocale', () => {
  it('respeta el orden de preferencia del navegador', () => {
    expect(detectLocale(['es-MX', 'en'])).toBe('es');
    expect(detectLocale(['en-US', 'es'])).toBe('en');
    expect(detectLocale(['fr-FR', 'es-ES'])).toBe('es');
  });

  it('inglés si no prefiere ninguno de los nuestros', () => {
    expect(detectLocale(['fr-FR', 'de'])).toBe('en');
    expect(detectLocale([])).toBe('en');
  });
});
