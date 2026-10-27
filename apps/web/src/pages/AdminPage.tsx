import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { api, type ReputationRow } from '../api';
import { useMe } from '../Layout';

const KIND_LABELS: Record<string, string> = {
  too_high: 'Debería ser más baja',
  too_low: 'Debería ser más alta',
  wrong_signal: 'Señal incorrecta',
  other: 'Otro',
};

const RATINGS: ReputationRow['rating'][] = ['reliable', 'mixed', 'unreliable', 'satire', 'unknown'];

export function AdminPage() {
  const { data: me } = useMe();
  if (!me?.user?.isAdmin) return <p className="cf-muted">Solo para administradores.</p>;
  return (
    <div className="cf-stack">
      <h1 style={{ margin: 0, fontSize: 22 }}>Administración</h1>
      <FeedbackQueue />
      <ReputationEditor />
    </div>
  );
}

function FeedbackQueue() {
  const [status, setStatus] = useState<'open' | 'resolved'>('open');
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ['admin-feedback', status],
    queryFn: () => api.admin.feedback(status),
  });
  const toggle = useMutation({
    mutationFn: (id: string) =>
      api.admin.resolveFeedback(id, status === 'open' ? 'resolved' : 'open'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-feedback'] }),
  });

  return (
    <div className="cf-card">
      <div className="cf-row" style={{ justifyContent: 'space-between' }}>
        <h2 className="cf-h2" style={{ margin: 0 }}>
          Avisos de usuarios
        </h2>
        <select
          className="input"
          style={{ width: 'auto' }}
          value={status}
          onChange={(e) => setStatus(e.target.value as 'open' | 'resolved')}
        >
          <option value="open">Abiertos</option>
          <option value="resolved">Resueltos</option>
        </select>
      </div>
      {data?.length === 0 && <p className="cf-muted cf-small">No hay avisos.</p>}
      {data?.map((f) => (
        <div className="list-item" key={f.id}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Link
              to={`/resultado/${f.analysisId}`}
              className="cf-link ellipsis"
              style={{ display: 'block' }}
            >
              {f.title || f.url}
            </Link>
            <div className="cf-small">
              <strong>{KIND_LABELS[f.kind] ?? f.kind}</strong> · puntuación {f.score ?? '–'} ·{' '}
              {f.domain}
            </div>
            {f.comment && <div className="cf-muted cf-small">“{f.comment}”</div>}
          </div>
          <button className="cf-btn" onClick={() => toggle.mutate(f.id)}>
            {status === 'open' ? 'Resolver' : 'Reabrir'}
          </button>
        </div>
      ))}
    </div>
  );
}

function ReputationEditor() {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ['admin-reputation'], queryFn: api.admin.reputation });
  const [form, setForm] = useState({
    domain: '',
    rating: 'mixed',
    source: 'Revisión manual',
    notes: '',
  });
  const [filter, setFilter] = useState('');

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-reputation'] });
  const save = useMutation({
    mutationFn: () =>
      api.admin.saveReputation(form.domain.trim().toLowerCase(), {
        rating: form.rating,
        source: form.source,
        ...(form.notes ? { notes: form.notes } : {}),
      }),
    onSuccess: () => {
      setForm((f) => ({ ...f, domain: '', notes: '' }));
      invalidate();
    },
  });
  const remove = useMutation({ mutationFn: api.admin.deleteReputation, onSuccess: invalidate });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate();
  };

  return (
    <div className="cf-card cf-stack">
      <h2 className="cf-h2" style={{ margin: 0 }}>
        Reputación de dominios
      </h2>
      <form className="cf-stack" onSubmit={submit}>
        <div className="cf-row" style={{ flexWrap: 'wrap' }}>
          <input
            className="input"
            style={{ flex: 2, minWidth: 160 }}
            placeholder="dominio.com"
            value={form.domain}
            onChange={(e) => setForm({ ...form, domain: e.target.value })}
            required
          />
          <select
            className="input"
            style={{ flex: 1, minWidth: 120 }}
            value={form.rating}
            onChange={(e) => setForm({ ...form, rating: e.target.value })}
          >
            {RATINGS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </div>
        <input
          className="input"
          placeholder="Fuente de la valoración"
          value={form.source}
          onChange={(e) => setForm({ ...form, source: e.target.value })}
          required
        />
        <input
          className="input"
          placeholder="Notas (opcional)"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
        {save.error && <span className="error cf-small">{save.error.message}</span>}
        <button className="cf-btn cf-btn-primary" type="submit" disabled={save.isPending}>
          Guardar
        </button>
      </form>
      <input
        className="input"
        placeholder="Filtrar…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      <div>
        {data
          ?.filter((r) => r.domain.includes(filter.toLowerCase()))
          .map((r) => (
            <div className="list-item" key={r.domain}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong>{r.domain}</strong> <span className="cf-small">· {r.rating}</span>
                <div className="cf-muted cf-small ellipsis">
                  {r.source}
                  {r.notes ? ` — ${r.notes}` : ''}
                </div>
              </div>
              <button
                className="cf-btn"
                onClick={() =>
                  setForm({
                    domain: r.domain,
                    rating: r.rating,
                    source: r.source,
                    notes: r.notes ?? '',
                  })
                }
              >
                Editar
              </button>
              <button
                className="cf-btn"
                aria-label="Eliminar"
                onClick={() => confirm(`¿Eliminar ${r.domain}?`) && remove.mutate(r.domain)}
              >
                ✕
              </button>
            </div>
          ))}
      </div>
    </div>
  );
}
