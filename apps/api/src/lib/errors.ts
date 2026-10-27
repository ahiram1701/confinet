export class HttpError extends Error {
  constructor(
    public status: 400 | 401 | 403 | 404 | 413 | 415 | 422 | 429 | 500 | 502 | 503,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}
