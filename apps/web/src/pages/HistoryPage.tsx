import { colorFor } from '@confinet/ui';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router';
import { api, MODE } from '../api';
import { useMe } from '../Layout';

export function HistoryPage() {
  const { data: me, isLoading: loadingMe } = useMe();
  const queryClient = useQueryClient();
  const history = useInfiniteQuery({
    queryKey: ['history'],
    queryFn: ({ pageParam }) => api.history(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextBefore ?? undefined,
    // En modo estático el historial es local: no hace falta cuenta.
    enabled: MODE === 'static' || !!me?.user,
  });
  const remove = useMutation({
    mutationFn: api.deleteHistory,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['history'] }),
  });
  const clear = useMutation({
    mutationFn: api.clearHistory,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['history'] }),
  });

  if (loadingMe) return <p className="cf-muted">Cargando…</p>;
  if (MODE !== 'static' && !me?.user) {
    return (
      <div className="cf-card cf-stack">
        <strong>Inicia sesión para guardar tu historial</strong>
        <span className="cf-muted">
          Tu historial se sincroniza entre la extensión del navegador y esta app.
        </span>
        <Link
          to="/cuenta"
          className="cf-btn cf-btn-primary"
          style={{ textAlign: 'center', textDecoration: 'none' }}
        >
          Iniciar sesión
        </Link>
      </div>
    );
  }

  const items = history.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="cf-stack">
      <div className="cf-row" style={{ justifyContent: 'space-between' }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>Historial</h1>
        {items.length > 0 && (
          <button
            className="cf-btn"
            onClick={() => confirm('¿Borrar todo el historial?') && clear.mutate()}
            disabled={clear.isPending}
          >
            Borrar todo
          </button>
        )}
      </div>

      <div className="cf-card">
        {history.isLoading && <p className="cf-muted">Cargando…</p>}
        {!history.isLoading && items.length === 0 && (
          <p className="cf-muted" style={{ margin: 0 }}>
            Aún no has analizado nada.
          </p>
        )}
        {items.map((item) => (
          <div key={item.id} className="list-item">
            <Link
              to={`/resultado/${item.analysisId}`}
              className="cf-row"
              style={{ flex: 1, minWidth: 0, color: 'inherit', textDecoration: 'none' }}
            >
              <span className="score-pill" style={{ background: colorFor(item.score) }}>
                {item.score ?? '–'}
              </span>
              <span style={{ minWidth: 0 }}>
                <div className="ellipsis">
                  <strong>{item.title || item.url}</strong>
                </div>
                <div className="cf-muted cf-small">
                  {item.domain} · {new Date(item.viewedAt).toLocaleString('es')}
                </div>
              </span>
            </Link>
            <button className="cf-btn" aria-label="Eliminar" onClick={() => remove.mutate(item.id)}>
              ✕
            </button>
          </div>
        ))}
        {history.hasNextPage && (
          <button
            className="cf-btn"
            onClick={() => history.fetchNextPage()}
            disabled={history.isFetchingNextPage}
          >
            Cargar más
          </button>
        )}
      </div>
    </div>
  );
}
