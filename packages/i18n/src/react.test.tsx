import { isValidElement, type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { renderRich } from './react';

const flat = (node: ReactNode): string[] =>
  (Array.isArray(node) ? node : [node]).flatMap((n) =>
    isValidElement<{ children: ReactNode }>(n) ? [`[${String(n.props.children)}]`] : [String(n)],
  );

describe('renderRich', () => {
  it('sustituye las etiquetas conocidas y deja el resto como texto', () => {
    const out = renderRich('Inicia <link>sesión</link> y <b>listo</b> <x>no</x>', {
      link: (s) => s.toUpperCase(),
      b: (s) => s,
    });
    expect(flat(out).join('')).toBe('Inicia [SESIÓN] y [listo] <x>no</x>');
  });

  it('es rápida con textos maliciosos', () => {
    const start = performance.now();
    renderRich('<a>' + '<a>a'.repeat(50_000), { a: (s) => s });
    expect(performance.now() - start).toBeLessThan(500);
  });
});
