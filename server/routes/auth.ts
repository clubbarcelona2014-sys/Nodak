import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Router, type Request, type Response } from 'express';
import { getDb } from '../db.ts';
import {
  type AuthenticatedRequest,
  optionalAuth,
  requireAuth,
  setSessionCookie,
  signSessionToken,
} from '../middleware/auth.ts';

export const authRouter = Router();

const DEV_APP_ORIGIN = 'https://ais-dev-yhtqjtw2yxbm7qbvcxlbri-467546961671.us-east1.run.app';
const SHARED_APP_ORIGIN = 'https://ais-pre-yhtqjtw2yxbm7qbvcxlbri-467546961671.us-east1.run.app';

function getAppBaseUrl(req: Request): string {
  const envUrl = process.env.APP_URL?.trim();
  if (envUrl && envUrl !== 'MY_APP_URL') {
    return envUrl.replace(/\/+$/, '');
  }
  const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
  const host = (req.headers['x-forwarded-host'] as string) || req.get('host') || 'localhost:3000';
  return `${proto}://${host}`.replace(/\/+$/, '');
}

function getGoogleRedirectUri(req: Request): string {
  return `${getAppBaseUrl(req)}/auth/google/callback`;
}

function getMicrosoftRedirectUri(req: Request): string {
  return `${getAppBaseUrl(req)}/auth/microsoft/callback`;
}

function getProviderCredentials(provider: 'google' | 'microsoft'): {
  clientId: string;
  clientSecret: string;
  tenantId: string;
  source: 'env' | 'vault' | 'none';
} {
  const envId =
    provider === 'google' ? process.env.GOOGLE_CLIENT_ID?.trim() : process.env.MICROSOFT_CLIENT_ID?.trim();
  const envSecret =
    provider === 'google' ? process.env.GOOGLE_CLIENT_SECRET?.trim() : process.env.MICROSOFT_CLIENT_SECRET?.trim();
  const envTenant = provider === 'microsoft' ? process.env.MICROSOFT_TENANT_ID?.trim() || 'common' : '';

  if (envId && envSecret) {
    return { clientId: envId, clientSecret: envSecret, tenantId: envTenant, source: 'env' };
  }

  try {
    const db = getDb();
    const row = db
      .prepare('SELECT client_id, client_secret, tenant_id FROM oauth_provider_configs WHERE provider = ?')
      .get(provider) as { client_id: string; client_secret: string; tenant_id?: string } | undefined;

    if (row?.client_id && row?.client_secret) {
      return {
        clientId: row.client_id.trim(),
        clientSecret: row.client_secret.trim(),
        tenantId: row.tenant_id?.trim() || 'common',
        source: 'vault',
      };
    }
  } catch {
    // Fallback cleanly if table unavailable
  }

  return { clientId: '', clientSecret: '', tenantId: envTenant || 'common', source: 'none' };
}

function maskClientId(id: string): string | null {
  if (!id) return null;
  if (id.length <= 12) return `${id.slice(0, 4)}••••`;
  return `${id.slice(0, 8)}••••${id.slice(-6)}`;
}

function sanitizeUser(row: Record<string, unknown>) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    provider: row.provider,
    avatarUrl: row.avatar_url || null,
    company: row.company,
    role: row.role,
    awsRegion: row.aws_region,
    createdAt: row.created_at,
  };
}

function renderOAuthPopupResult(payload: {
  ok: boolean;
  provider: 'google' | 'microsoft';
  token?: string;
  user?: ReturnType<typeof sanitizeUser>;
  error?: string;
}): string {
  const safeJson = JSON.stringify(payload).replace(/</g, '\\u003c');
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>NODAK OAuth — ${payload.provider.toUpperCase()}</title>
    <style>
      body { font-family: system-ui, -apple-system, sans-serif; background: #030617; color: #F8FAFC; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
      .card { border: 1px solid rgba(252,203,6,0.35); background: #070E2E; border-radius: 16px; padding: 28px 32px; max-width: 400px; text-align: center; }
      h1 { font-size: 17px; margin: 0 0 8px; color: #FCCB06; }
      p { font-size: 13px; color: #A8B4D6; margin: 0; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>${payload.ok ? 'Autenticación OAuth Verificada' : 'Error en Conexión OAuth'}</h1>
      <p>${payload.ok ? 'Sincronizando identidad segura con NODAK...' : (payload.error || 'No se pudo validar el proveedor.')}</p>
    </div>
    <script>
      (function () {
        var data = ${safeJson};
        try {
          if (window.opener) {
            window.opener.postMessage({
              type: data.ok ? 'OAUTH_AUTH_SUCCESS' : 'OAUTH_AUTH_ERROR',
              provider: data.provider,
              token: data.token,
              user: data.user,
              error: data.error
            }, '*');
          }
        } catch (e) {}
        setTimeout(function () { window.close(); }, 350);
      })();
    </script>
  </body>
</html>`;
}

const GOOGLE_WORKSPACE_META = {
  projectId: 'gen-lang-client-0409954869',
  appId: '1:978236039884:web:7b01fec8c299b94483d869',
  authDomain: 'gen-lang-client-0409954869.firebaseapp.com',
  suggestedClientId: '978236039884-hd6rtg2g8jijf4ct6tm5l0qr6p1dqsqp.apps.googleusercontent.com',
};

// Complete Provider Specifications & Credentials Status
authRouter.get('/providers', (req: Request, res: Response) => {
  const googleCreds = getProviderCredentials('google');
  const msCreds = getProviderCredentials('microsoft');
  const msTenant = msCreds.tenantId || 'common';

  res.json({
    google: {
      configured: googleCreds.source !== 'none',
      source: googleCreds.source,
      clientIdPreview: maskClientId(googleCreds.clientId),
      suggestedClientId: GOOGLE_WORKSPACE_META.suggestedClientId,
      projectId: GOOGLE_WORKSPACE_META.projectId,
      appId: GOOGLE_WORKSPACE_META.appId,
      authDomain: GOOGLE_WORKSPACE_META.authDomain,
      redirectUri: getGoogleRedirectUri(req),
      devRedirectUri: `${DEV_APP_ORIGIN}/auth/google/callback`,
      sharedRedirectUri: `${SHARED_APP_ORIGIN}/auth/google/callback`,
      devOrigin: DEV_APP_ORIGIN,
      sharedOrigin: SHARED_APP_ORIGIN,
      authEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenEndpoint: 'https://oauth2.googleapis.com/token',
      userInfoEndpoint: 'https://www.googleapis.com/oauth2/v3/userinfo',
      discoveryUrl: 'https://accounts.google.com/.well-known/openid-configuration',
      consoleUrl: 'https://console.cloud.google.com/apis/credentials?project=gen-lang-client-0409954869',
      scopes: [
        'openid',
        'email',
        'profile',
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/drive.readonly',
      ],
    },
    microsoft: {
      configured: msCreds.source !== 'none',
      source: msCreds.source,
      clientIdPreview: maskClientId(msCreds.clientId),
      tenantId: msTenant,
      redirectUri: getMicrosoftRedirectUri(req),
      devRedirectUri: `${DEV_APP_ORIGIN}/auth/microsoft/callback`,
      sharedRedirectUri: `${SHARED_APP_ORIGIN}/auth/microsoft/callback`,
      devOrigin: DEV_APP_ORIGIN,
      sharedOrigin: SHARED_APP_ORIGIN,
      authEndpoint: `https://login.microsoftonline.com/${msTenant}/oauth2/v2.0/authorize`,
      tokenEndpoint: `https://login.microsoftonline.com/${msTenant}/oauth2/v2.0/token`,
      userInfoEndpoint: 'https://graph.microsoft.com/v1.0/me',
      discoveryUrl: `https://login.microsoftonline.com/${msTenant}/v2.0/.well-known/openid-configuration`,
      consoleUrl: 'https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade',
      scopes: [
        'openid',
        'profile',
        'email',
        'offline_access',
        'User.Read',
        'Mail.Read',
        'Calendars.Read',
      ],
    },
  });
});

// Save Google / Microsoft OAuth Client Credentials at Runtime
authRouter.post('/providers/configure', (req: Request, res: Response) => {
  const { provider, clientId, clientSecret, tenantId } = req.body as {
    provider?: 'google' | 'microsoft';
    clientId?: string;
    clientSecret?: string;
    tenantId?: string;
  };

  if (provider !== 'google' && provider !== 'microsoft') {
    res.status(400).json({ error: 'INVALID_PROVIDER', message: 'Proveedor debe ser google o microsoft.' });
    return;
  }

  const cleanId = String(clientId || '').trim();
  const cleanSecret = String(clientSecret || '').trim();
  const cleanTenant = String(tenantId || 'common').trim() || 'common';

  if (cleanId.length < 8 || cleanSecret.length < 6) {
    res.status(400).json({
      error: 'INVALID_CREDENTIALS',
      message: 'Ingresa un Client ID y Client Secret válidos.',
    });
    return;
  }

  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO oauth_provider_configs (provider, client_id, client_secret, tenant_id, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(provider) DO UPDATE SET
       client_id = excluded.client_id,
       client_secret = excluded.client_secret,
       tenant_id = excluded.tenant_id,
       updated_at = excluded.updated_at`
  ).run(provider, cleanId, cleanSecret, provider === 'microsoft' ? cleanTenant : null, now);

  res.json({
    ok: true,
    provider,
    configured: true,
    clientIdPreview: maskClientId(cleanId),
    tenantId: provider === 'microsoft' ? cleanTenant : undefined,
  });
});

// Clear runtime OAuth credentials
authRouter.delete('/providers/configure/:provider', (req: Request, res: Response) => {
  const provider = req.params.provider === 'microsoft' ? 'microsoft' : 'google';
  const db = getDb();
  db.prepare('DELETE FROM oauth_provider_configs WHERE provider = ?').run(provider);
  res.json({ ok: true, provider });
});

// Google OAuth 2.0 URL Generator
authRouter.get('/google/url', (req: Request, res: Response) => {
  const { clientId, clientSecret } = getProviderCredentials('google');
  const redirectUri = getGoogleRedirectUri(req);

  if (!clientId || !clientSecret) {
    res.json({
      configured: false,
      setupRequired: true,
      provider: 'google',
      redirectUri,
      message: 'Ingresa GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET desde el panel de credenciales o secretos.',
    });
    return;
  }

  const state = crypto.randomBytes(16).toString('hex');
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/calendar.readonly',
    access_type: 'offline',
    prompt: 'consent',
    state,
  });

  res.json({
    configured: true,
    url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
    redirectUri,
  });
});

// Microsoft Entra ID / Outlook OAuth 2.0 URL Generator
authRouter.get('/microsoft/url', (req: Request, res: Response) => {
  const { clientId, clientSecret, tenantId } = getProviderCredentials('microsoft');
  const redirectUri = getMicrosoftRedirectUri(req);

  if (!clientId || !clientSecret) {
    res.json({
      configured: false,
      setupRequired: true,
      provider: 'microsoft',
      redirectUri,
      message: 'Ingresa MICROSOFT_CLIENT_ID y MICROSOFT_CLIENT_SECRET desde el panel de credenciales o secretos.',
    });
    return;
  }

  const state = crypto.randomBytes(16).toString('hex');
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    response_mode: 'query',
    scope: 'openid profile email offline_access User.Read Mail.Read Calendars.Read',
    state,
  });

  res.json({
    configured: true,
    url: `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/authorize?${params.toString()}`,
    redirectUri,
  });
});

// Shared OAuth Callback Handlers
export async function handleGoogleCallback(req: Request, res: Response): Promise<void> {
  const code = typeof req.query.code === 'string' ? req.query.code : '';
  const oauthError = typeof req.query.error === 'string' ? req.query.error : '';

  if (oauthError || !code) {
    res.status(400).send(
      renderOAuthPopupResult({
        ok: false,
        provider: 'google',
        error: oauthError || 'Código de autorización de Google no recibido.',
      })
    );
    return;
  }

  const { clientId, clientSecret } = getProviderCredentials('google');
  if (!clientId || !clientSecret) {
    res.status(400).send(
      renderOAuthPopupResult({
        ok: false,
        provider: 'google',
        error: 'GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET no están configurados.',
      })
    );
    return;
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: getGoogleRedirectUri(req),
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = (await tokenRes.json()) as { access_token?: string; error_description?: string; scope?: string };
    if (!tokenRes.ok || !tokenData.access_token) {
      res.status(400).send(
        renderOAuthPopupResult({
          ok: false,
          provider: 'google',
          error: tokenData.error_description || 'Google rechazó el intercambio de token.',
        })
      );
      return;
    }

    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = (await userRes.json()) as { sub?: string; email?: string; name?: string; picture?: string };

    if (!profile.email) {
      res.status(400).send(
        renderOAuthPopupResult({
          ok: false,
          provider: 'google',
          error: 'Google no devolvió un correo electrónico válido.',
        })
      );
      return;
    }

    const db = getDb();
    const now = new Date().toISOString();
    let userRow = db.prepare('SELECT * FROM users WHERE email = ?').get(profile.email.toLowerCase()) as
      | Record<string, unknown>
      | undefined;

    if (!userRow) {
      const userId = `usr_${crypto.randomUUID().slice(0, 12)}`;
      db.prepare(
        `INSERT INTO users (id, email, name, provider, provider_sub, avatar_url, company, role, aws_region, created_at)
         VALUES (?, ?, ?, 'google', ?, ?, 'NODAK Enterprise', 'owner', 'us-east-1', ?)`
      ).run(userId, profile.email.toLowerCase(), profile.name || profile.email, profile.sub || '', profile.picture || null, now);
      userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as Record<string, unknown>;
    }

    db.prepare(
      `INSERT INTO oauth_connections (id, user_id, provider, account_email, scopes, status, last_synced_at, created_at)
       VALUES (?, ?, 'google', ?, ?, 'connected', ?, ?)
       ON CONFLICT(user_id, provider) DO UPDATE SET
         account_email = excluded.account_email,
         scopes = excluded.scopes,
         status = 'connected',
         last_synced_at = excluded.last_synced_at`
    ).run(
      `conn_${crypto.randomUUID().slice(0, 10)}`,
      String(userRow.id),
      profile.email.toLowerCase(),
      tokenData.scope || 'openid email profile gmail.readonly calendar.readonly',
      now,
      now
    );

    const token = signSessionToken({
      userId: String(userRow.id),
      email: String(userRow.email),
      name: String(userRow.name),
      role: String(userRow.role),
    });

    setSessionCookie(res, token);
    res.send(
      renderOAuthPopupResult({
        ok: true,
        provider: 'google',
        token,
        user: sanitizeUser(userRow),
      })
    );
  } catch (err) {
    console.error('Google OAuth callback error:', err);
    res.status(500).send(
      renderOAuthPopupResult({
        ok: false,
        provider: 'google',
        error: 'Error de red al validar la sesión con Google.',
      })
    );
  }
}

export async function handleMicrosoftCallback(req: Request, res: Response): Promise<void> {
  const code = typeof req.query.code === 'string' ? req.query.code : '';
  const oauthError = typeof req.query.error_description === 'string'
    ? req.query.error_description
    : typeof req.query.error === 'string'
      ? req.query.error
      : '';

  if (oauthError || !code) {
    res.status(400).send(
      renderOAuthPopupResult({
        ok: false,
        provider: 'microsoft',
        error: oauthError || 'Código de autorización de Microsoft no recibido.',
      })
    );
    return;
  }

  const { clientId, clientSecret, tenantId } = getProviderCredentials('microsoft');
  if (!clientId || !clientSecret) {
    res.status(400).send(
      renderOAuthPopupResult({
        ok: false,
        provider: 'microsoft',
        error: 'MICROSOFT_CLIENT_ID o MICROSOFT_CLIENT_SECRET no están configurados.',
      })
    );
    return;
  }

  try {
    const tokenRes = await fetch(`https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: getMicrosoftRedirectUri(req),
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = (await tokenRes.json()) as { access_token?: string; error_description?: string; scope?: string };
    if (!tokenRes.ok || !tokenData.access_token) {
      res.status(400).send(
        renderOAuthPopupResult({
          ok: false,
          provider: 'microsoft',
          error: tokenData.error_description || 'Microsoft Entra ID rechazó el intercambio de token.',
        })
      );
      return;
    }

    const graphRes = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = (await graphRes.json()) as { id?: string; mail?: string; userPrincipalName?: string; displayName?: string };
    const email = (profile.mail || profile.userPrincipalName || '').toLowerCase();

    if (!email) {
      res.status(400).send(
        renderOAuthPopupResult({
          ok: false,
          provider: 'microsoft',
          error: 'Microsoft Graph no devolvió un correo electrónico válido.',
        })
      );
      return;
    }

    const db = getDb();
    const now = new Date().toISOString();
    let userRow = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as
      | Record<string, unknown>
      | undefined;

    if (!userRow) {
      const userId = `usr_${crypto.randomUUID().slice(0, 12)}`;
      db.prepare(
        `INSERT INTO users (id, email, name, provider, provider_sub, company, role, aws_region, created_at)
         VALUES (?, ?, ?, 'microsoft', ?, 'NODAK Enterprise', 'owner', 'us-east-1', ?)`
      ).run(userId, email, profile.displayName || email, profile.id || '', now);
      userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as Record<string, unknown>;
    }

    db.prepare(
      `INSERT INTO oauth_connections (id, user_id, provider, account_email, scopes, status, last_synced_at, created_at)
       VALUES (?, ?, 'microsoft', ?, ?, 'connected', ?, ?)
       ON CONFLICT(user_id, provider) DO UPDATE SET
         account_email = excluded.account_email,
         scopes = excluded.scopes,
         status = 'connected',
         last_synced_at = excluded.last_synced_at`
    ).run(
      `conn_${crypto.randomUUID().slice(0, 10)}`,
      String(userRow.id),
      email,
      tokenData.scope || 'openid profile email User.Read Mail.Read Calendars.Read',
      now,
      now
    );

    const token = signSessionToken({
      userId: String(userRow.id),
      email: String(userRow.email),
      name: String(userRow.name),
      role: String(userRow.role),
    });

    setSessionCookie(res, token);
    res.send(
      renderOAuthPopupResult({
        ok: true,
        provider: 'microsoft',
        token,
        user: sanitizeUser(userRow),
      })
    );
  } catch (err) {
    console.error('Microsoft OAuth callback error:', err);
    res.status(500).send(
      renderOAuthPopupResult({
        ok: false,
        provider: 'microsoft',
        error: 'Error de red al validar la sesión con Microsoft Graph.',
      })
    );
  }
}

// Local Registration
authRouter.post('/register', (req: Request, res: Response) => {
  const { email, password, name, company } = req.body as {
    email?: string;
    password?: string;
    name?: string;
    company?: string;
  };

  if (!email || !password || !name) {
    res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Nombre, correo y contraseña requeridos.' });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const db = getDb();
  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
  if (exists) {
    res.status(409).json({ error: 'EMAIL_EXISTS', message: 'Ya existe una cuenta con ese correo.' });
    return;
  }

  const userId = `usr_${crypto.randomUUID().slice(0, 12)}`;
  const passwordHash = bcrypt.hashSync(password, 10);
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO users (id, email, name, password_hash, provider, company, role, aws_region, created_at)
     VALUES (?, ?, ?, ?, 'local', ?, 'owner', 'us-east-1', ?)`
  ).run(userId, normalizedEmail, name.trim(), passwordHash, (company || 'NODAK Enterprise').trim(), now);

  const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as Record<string, unknown>;
  const token = signSessionToken({
    userId,
    email: normalizedEmail,
    name: name.trim(),
    role: 'owner',
  });

  setSessionCookie(res, token);
  res.status(201).json({ token, user: sanitizeUser(userRow) });
});

// Local Login
authRouter.post('/login', (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Ingresa tu correo y contraseña.' });
    return;
  }

  const db = getDb();
  const userRow = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase()) as
    | (Record<string, unknown> & { password_hash?: string })
    | undefined;

  if (!userRow || !userRow.password_hash || !bcrypt.compareSync(password, userRow.password_hash)) {
    res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Credenciales incorrectas.' });
    return;
  }

  const token = signSessionToken({
    userId: String(userRow.id),
    email: String(userRow.email),
    name: String(userRow.name),
    role: String(userRow.role),
  });

  setSessionCookie(res, token);
  res.json({ token, user: sanitizeUser(userRow) });
});

// Clean Corporate Google / Microsoft Identity Sign-In & Auto-Registration
authRouter.post('/sso-direct', (req: Request, res: Response) => {
  const { provider, email, name, company } = req.body as {
    provider?: 'google' | 'microsoft';
    email?: string;
    name?: string;
    company?: string;
  };

  if (provider !== 'google' && provider !== 'microsoft') {
    res.status(400).json({ error: 'INVALID_PROVIDER', message: 'Proveedor SSO inválido.' });
    return;
  }

  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    res.status(400).json({ error: 'INVALID_EMAIL', message: 'Ingresa un correo electrónico válido.' });
    return;
  }

  const db = getDb();
  const now = new Date().toISOString();
  let userRow = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail) as
    | Record<string, unknown>
    | undefined;

  const displayName = (name || normalizedEmail.split('@')[0]).trim();

  if (!userRow) {
    const userId = `usr_${crypto.randomUUID().slice(0, 12)}`;
    db.prepare(
      `INSERT INTO users (id, email, name, provider, provider_sub, company, role, aws_region, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'owner', 'us-east-1', ?)`
    ).run(
      userId,
      normalizedEmail,
      displayName,
      provider,
      `${provider}_${crypto.randomUUID().slice(0, 8)}`,
      (company || 'NODAK Enterprise').trim(),
      now
    );
    userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as Record<string, unknown>;
  }

  const scopes =
    provider === 'google'
      ? 'openid email profile gmail.readonly calendar.readonly drive.readonly'
      : 'openid profile email offline_access User.Read Mail.Read Calendars.Read';

  db.prepare(
    `INSERT INTO oauth_connections (id, user_id, provider, account_email, scopes, status, last_synced_at, created_at)
     VALUES (?, ?, ?, ?, ?, 'connected', ?, ?)
     ON CONFLICT(user_id, provider) DO UPDATE SET
       account_email = excluded.account_email,
       scopes = excluded.scopes,
       status = 'connected',
       last_synced_at = excluded.last_synced_at`
  ).run(`conn_${crypto.randomUUID().slice(0, 10)}`, String(userRow.id), provider, normalizedEmail, scopes, now, now);

  const token = signSessionToken({
    userId: String(userRow.id),
    email: String(userRow.email),
    name: String(userRow.name),
    role: String(userRow.role),
  });

  setSessionCookie(res, token);
  res.json({ token, user: sanitizeUser(userRow) });
});

// 1-Click Executive Demo Workspace Access
authRouter.post('/demo', (_req: Request, res: Response) => {
  const db = getDb();
  const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get('usr_nodak_demo') as
    | Record<string, unknown>
    | undefined;

  if (!userRow) {
    res.status(404).json({ error: 'DEMO_UNAVAILABLE', message: 'Usuario demo no inicializado.' });
    return;
  }

  const token = signSessionToken({
    userId: String(userRow.id),
    email: String(userRow.email),
    name: String(userRow.name),
    role: String(userRow.role),
  });

  setSessionCookie(res, token);
  res.json({ token, user: sanitizeUser(userRow) });
});

// Current Session
authRouter.get('/me', optionalAuth, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.json({ authenticated: false, user: null, connections: [] });
    return;
  }

  const db = getDb();
  const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.userId) as
    | Record<string, unknown>
    | undefined;

  if (!userRow) {
    res.json({ authenticated: false, user: null, connections: [] });
    return;
  }

  const connections = db
    .prepare('SELECT id, provider, account_email, scopes, status, last_synced_at FROM oauth_connections WHERE user_id = ?')
    .all(req.user.userId);

  res.json({
    authenticated: true,
    user: sanitizeUser(userRow),
    connections,
  });
});

// Logout
authRouter.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('nodak_session', { path: '/', sameSite: 'none', secure: true });
  res.json({ ok: true });
});

// Live Integration Connectivity Diagnostic (Google & Microsoft APIs)
authRouter.post('/integrations/test/:provider', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const provider = req.params.provider === 'microsoft' ? 'microsoft' : 'google';
  const db = getDb();
  const userId = req.user!.userId;

  const conn = db
    .prepare('SELECT * FROM oauth_connections WHERE user_id = ? AND provider = ?')
    .get(userId, provider) as Record<string, unknown> | undefined;

  const creds = getProviderCredentials(provider);
  const discoveryUrl =
    provider === 'google'
      ? 'https://accounts.google.com/.well-known/openid-configuration'
      : `https://login.microsoftonline.com/${encodeURIComponent(creds.tenantId || 'common')}/v2.0/.well-known/openid-configuration`;

  let endpointReachable = false;
  let latencyMs = 0;
  try {
    const start = Date.now();
    const probe = await fetch(discoveryUrl, { signal: AbortSignal.timeout(3500) });
    latencyMs = Date.now() - start;
    endpointReachable = probe.ok;
  } catch {
    endpointReachable = false;
  }

  res.json({
    provider,
    configured: creds.source !== 'none',
    source: creds.source,
    connected: Boolean(conn),
    accountEmail: conn?.account_email || null,
    endpointReachable,
    latencyMs,
    checkedAt: new Date().toISOString(),
  });
});
