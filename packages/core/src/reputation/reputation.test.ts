import { describe, expect, it } from 'vitest';
import { lookupOpenReputation, OPEN_REPUTATION_SOURCE } from './open';
import { parseRsp, toDomainMap } from './rsp';

// Fragmento con el formato real de las subpáginas de «Perennial sources» (action=raw).
const WIKITEXT = `{| class="wikitable sortable perennial-sources"
|-
! scope="col" | Source
<onlyinclude>
|- class="s-gr" id="ABC News"
| [[ABC News (United States)|ABC News (USA)]]
| {{WP:RSPSTATUS|gr}}
| {{WP:RSPLAST|2021}}
| There is consensus that ABC News is generally reliable.
| {{WP:RSPUSES|abcnews.com|abcnews.go.com}}
|- class="s-nc" id="Academic repositories"
| Academic repositories {{WP:RSPSHORTCUT|WP:ACADREP}}
|- class="s-b" id="Advameg"
| [[Advameg]] <small>([[City-Data]])</small>
| {{WP:RSPSTATUS|gu|b=y}}
| {{WP:RSPUSES|city-data.com|www.filmreference.com}}
|- class="s-gu" id="Fox News (politics)"
| Fox News (politics and science)
| {{WP:RSPSTATUS|gu}}
| {{WP:RSPUSES|foxnews.com}}
|- class="s-nc" id="Fox News"
| Fox News (excluding politics and science)
| {{WP:RSPSTATUS|nc}}
| {{WP:RSPUSES|foxnews.com|https=yes}}
</onlyinclude>
|}`;

describe('parseRsp', () => {
  const entries = parseRsp(WIKITEXT);

  it('lee nombre, valoración y dominios de cada fila', () => {
    expect(entries[0]).toEqual({
      name: 'ABC News',
      rating: 'reliable',
      domains: ['abcnews.com', 'abcnews.go.com'],
    });
  });

  it('las vetadas cuentan como poco fiables y se quita www.', () => {
    expect(entries.find((e) => e.name === 'Advameg')).toEqual({
      name: 'Advameg',
      rating: 'unreliable',
      domains: ['city-data.com', 'filmreference.com'],
    });
  });

  it('omite filas sin valoración o sin dominios, e ignora parámetros', () => {
    expect(entries.map((e) => e.name)).not.toContain('Academic repositories');
    expect(entries.find((e) => e.name === 'Fox News')?.domains).toEqual(['foxnews.com']);
  });

  it('un dominio con valoraciones distintas queda como mixto', () => {
    expect(toDomainMap(entries)['foxnews.com']?.[0]).toBe('mixed');
  });
});

describe('lookupOpenReputation', () => {
  it('encuentra un medio de la lista por su dominio registrable', () => {
    expect(lookupOpenReputation('www.reuters.com', 'reuters.com')).toMatchObject({
      rating: 'reliable',
      source: OPEN_REPUTATION_SOURCE,
    });
    expect(lookupOpenReputation('news.dailymail.co.uk', 'dailymail.co.uk')?.rating).toBe(
      'unreliable',
    );
  });

  it('devuelve null si no está', () => {
    expect(lookupOpenReputation('ejemplo-que-no-existe.es', 'ejemplo-que-no-existe.es')).toBeNull();
  });
});
