import type { AnalyzeRequest, AnalyzeResponse, HistoryItem } from '@confinet/core';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api/v1${path}`, {
    ...init,
    credentials: 'same-origin',
    headers: init.body ? { 'content-type': 'application/json', ...init.headers } : init.headers,
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, data.code ?? 'error', data.error ?? `Error ${res.status}`);
  }
  return data as T;
}

export interface Me {
  user: { id: string; email: string; name: string; isAdmin: boolean } | null;
  usage: { analyses: number; ai: number };
  limits: { analyses: number; ai: number };
  llm: ByokSettings | null;
}

export interface ByokSettings {
  provider: string;
  model: string;
  baseUrl: string | null;
  hasKey: boolean;
}

export interface ExtensionToken {
  id: string;
  label: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface FeedbackRow {
  id: string;
  kind: string;
  comment: string | null;
  status: 'open' | 'resolved';
  createdAt: string;
  analysisId: string;
  url: string;
  domain: string;
  title: string;
  score: number | null;
}

export interface ReputationRow {
  domain: string;
  rating: 'reliable' | 'mixed' | 'unreliable' | 'satire' | 'unknown';
  source: string;
  notes: string | null;
  updatedAt: string;
  updatedBy: string | null;
}

export const httpApi = {
  config: () =>
    request<{ devLogin: boolean; oauth: { google: boolean; github: boolean } }>('/config'),
  me: () => request<Me>('/me'),
  analyze: (body: AnalyzeRequest) =>
    request<AnalyzeResponse>('/analyze', { method: 'POST', body: JSON.stringify(body) }),
  analysis: (id: string) => request<AnalyzeResponse>(`/analyses/${id}`),
  history: (before?: string) =>
    request<{ items: HistoryItem[]; nextBefore: string | null }>(
      `/history${before ? `?before=${encodeURIComponent(before)}` : ''}`,
    ),
  deleteHistory: (id: string) => request<void>(`/history/${id}`, { method: 'DELETE' }),
  clearHistory: () => request<void>('/history', { method: 'DELETE' }),
  feedback: (analysisId: string, kind: string, comment?: string) =>
    request<{ ok: true }>('/feedback', {
      method: 'POST',
      body: JSON.stringify({ analysisId, kind, comment }),
    }),
  providers: () => request<{ id: string }[]>('/providers'),
  saveLlm: (body: { provider: string; model: string; apiKey?: string; baseUrl?: string }) =>
    request<ByokSettings>('/settings/llm', { method: 'PUT', body: JSON.stringify(body) }),
  deleteLlm: () => request<void>('/settings/llm', { method: 'DELETE' }),
  createExtensionToken: (label: string) =>
    request<{ id: string; token: string }>('/extension/token', {
      method: 'POST',
      body: JSON.stringify({ label }),
    }),
  extensionTokens: () => request<ExtensionToken[]>('/extension/tokens'),
  revokeExtensionToken: (id: string) =>
    request<void>(`/extension/tokens/${id}`, { method: 'DELETE' }),
  admin: {
    feedback: (status: 'open' | 'resolved') =>
      request<FeedbackRow[]>(`/admin/feedback?status=${status}`),
    resolveFeedback: (id: string, status: 'open' | 'resolved') =>
      request(`/admin/feedback/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    reputation: () => request<ReputationRow[]>('/admin/reputation'),
    saveReputation: (domain: string, body: { rating: string; source: string; notes?: string }) =>
      request(`/admin/reputation/${encodeURIComponent(domain)}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
    deleteReputation: (domain: string) =>
      request(`/admin/reputation/${encodeURIComponent(domain)}`, { method: 'DELETE' }),
  },
};
