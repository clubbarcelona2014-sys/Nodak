const TOKEN_KEY = 'nodak_jwt_token';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // Ignore storage restriction errors in sandboxed iframes
  }
}

function waitMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const method = (options.method || 'GET').toUpperCase();
  const maxAttempts = method === 'GET' ? 3 : 1;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(path, {
        ...options,
        headers,
        credentials: 'include',
      });

      const text = await response.text();
      let parsed: unknown = {};
      if (text) {
        try {
          parsed = JSON.parse(text);
        } catch {
          parsed = { message: text };
        }
      }

      if (!response.ok) {
        if ([502, 503, 504].includes(response.status) && attempt < maxAttempts) {
          await waitMs(220 * attempt);
          continue;
        }
        const errObj = parsed as { message?: string; error?: string };
        throw new Error(errObj.message || errObj.error || `Error HTTP ${response.status}`);
      }

      return parsed as T;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error('Error de conexión con el servidor.');
      if (attempt < maxAttempts && !(lastError.message.startsWith('Error HTTP 4'))) {
        await waitMs(220 * attempt);
        continue;
      }
      throw lastError;
    }
  }

  throw lastError || new Error('No se pudo conectar con NODAK.');
}

export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function formatCurrencyExact(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}
