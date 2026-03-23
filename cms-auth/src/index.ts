interface Env {
  ALLOWED_ORIGINS?: string;
  GITHUB_OAUTH_ID?: string;
  GITHUB_OAUTH_SECRET?: string;
}

interface StatePayload {
  origin: string;
  provider: "github";
  scope: string;
  timestamp: number;
}

const encoder = new TextEncoder();

const html = (body: string, status = 200) =>
  new Response(body, {
    status,
    headers: {
      "content-type": "text/html; charset=UTF-8",
      "cache-control": "no-store",
    },
  });

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=UTF-8",
      "cache-control": "no-store",
    },
  });

const toBase64Url = (value: string) =>
  btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");

const fromBase64Url = (value: string) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));

  return atob(`${normalized}${padding}`);
};

const bytesToBase64Url = (value: ArrayBuffer) =>
  toBase64Url(String.fromCharCode(...new Uint8Array(value)));

const getAllowedOrigins = (env: Env) =>
  (env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

const normalizeOrigin = (siteId: string | null) => {
  if (!siteId) {
    return null;
  }

  if (siteId.startsWith("https://") || siteId.startsWith("http://")) {
    return new URL(siteId).origin;
  }

  return new URL(`https://${siteId}`).origin;
};

const setupPage = (message: string) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Beauty by Bugi CMS Auth</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 2rem;
        background: #f6efe8;
        color: #2d1d1d;
        font-family: "Segoe UI", sans-serif;
      }

      main {
        max-width: 42rem;
        padding: 2rem;
        border-radius: 1.5rem;
        background: rgba(255, 250, 247, 0.94);
        box-shadow: 0 18px 40px rgba(78, 42, 39, 0.12);
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Beauty by Bugi CMS auth proxy</h1>
      <p>${message}</p>
    </main>
  </body>
</html>`;

const authPage = (provider: string, origin: string, redirectUrl: string) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Connecting to GitHub</title>
  </head>
  <body>
    <script>
      const targetOrigin = ${JSON.stringify(origin)};
      const redirectUrl = ${JSON.stringify(redirectUrl)};
      const provider = ${JSON.stringify(provider)};

      if (!window.opener) {
        document.body.textContent = "This page must be opened from the CMS login popup.";
      } else {
        window.opener.postMessage("authorizing:" + provider, targetOrigin);
        window.addEventListener("message", (event) => {
          if (event.origin === targetOrigin && event.data === "authorizing:" + provider) {
            window.location.replace(redirectUrl);
          }
        });
      }
    </script>
  </body>
</html>`;

const callbackPage = (origin: string, message: string) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Returning to CMS</title>
  </head>
  <body>
    <script>
      const targetOrigin = ${JSON.stringify(origin)};
      const message = ${JSON.stringify(message)};

      if (window.opener) {
        window.opener.postMessage(message, targetOrigin);
      }

      window.close();
      document.body.textContent = "You can close this window.";
    </script>
  </body>
</html>`;

const importSigningKey = async (secret: string) =>
  crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);

const signState = async (payload: StatePayload, secret: string) => {
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const key = await importSigningKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(encodedPayload));

  return `${encodedPayload}.${bytesToBase64Url(signature)}`;
};

const readState = async (state: string, secret: string) => {
  const [encodedPayload, encodedSignature] = state.split(".");

  if (!encodedPayload || !encodedSignature) {
    return null;
  }

  const key = await importSigningKey(secret);
  const signature = Uint8Array.from(fromBase64Url(encodedSignature), (char) => char.charCodeAt(0));
  const isValid = await crypto.subtle.verify(
    "HMAC",
    key,
    signature,
    encoder.encode(encodedPayload)
  );

  if (!isValid) {
    return null;
  }

  const payload = JSON.parse(fromBase64Url(encodedPayload)) as StatePayload;

  if (Date.now() - payload.timestamp > 10 * 60 * 1000) {
    return null;
  }

  return payload;
};

const errorMessage = (origin: string, error: string) =>
  callbackPage(
    origin,
    `authorization:github:error:${JSON.stringify({
      message: error,
    })}`
  );

const successMessage = (origin: string, token: string) =>
  callbackPage(
    origin,
    `authorization:github:success:${JSON.stringify({
      token,
      provider: "github",
    })}`
  );

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/") {
      const configured = Boolean(env.GITHUB_OAUTH_ID && env.GITHUB_OAUTH_SECRET);

      return html(
        setupPage(
          configured
            ? "Proxy je deployan i spreman za GitHub OAuth prijavu."
            : "Proxy je deployan, ali još nedostaju GitHub OAuth credentials."
        )
      );
    }

    if (url.pathname === "/auth") {
      if (!env.GITHUB_OAUTH_ID || !env.GITHUB_OAUTH_SECRET) {
        return html(setupPage("Nedostaju GITHUB_OAUTH_ID i GITHUB_OAUTH_SECRET."), 500);
      }

      const provider = url.searchParams.get("provider");

      if (provider !== "github") {
        return json({ message: "Only GitHub is supported." }, 400);
      }

      const origin = normalizeOrigin(url.searchParams.get("site_id"));

      if (!origin) {
        return json({ message: "Missing site_id query parameter." }, 400);
      }

      const allowedOrigins = getAllowedOrigins(env);

      if (allowedOrigins.length > 0 && !allowedOrigins.includes(origin)) {
        return json({ message: "Origin is not allowed." }, 403);
      }

      const scope = url.searchParams.get("scope") || "repo";
      const state = await signState(
        {
          origin,
          provider: "github",
          scope,
          timestamp: Date.now(),
        },
        env.GITHUB_OAUTH_SECRET
      );

      const githubUrl = new URL("https://github.com/login/oauth/authorize");
      githubUrl.searchParams.set("client_id", env.GITHUB_OAUTH_ID);
      githubUrl.searchParams.set("redirect_uri", `${url.origin}/callback`);
      githubUrl.searchParams.set("scope", scope);
      githubUrl.searchParams.set("state", state);

      return html(authPage(provider, origin, githubUrl.toString()));
    }

    if (url.pathname === "/callback") {
      if (!env.GITHUB_OAUTH_ID || !env.GITHUB_OAUTH_SECRET) {
        return html(setupPage("Nedostaju GITHUB_OAUTH_ID i GITHUB_OAUTH_SECRET."), 500);
      }

      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      const githubError = url.searchParams.get("error");

      if (!state) {
        return json({ message: "Missing state parameter." }, 400);
      }

      const statePayload = await readState(state, env.GITHUB_OAUTH_SECRET);

      if (!statePayload) {
        return json({ message: "Invalid or expired state." }, 400);
      }

      if (githubError) {
        return html(errorMessage(statePayload.origin, githubError), 400);
      }

      if (!code) {
        return html(errorMessage(statePayload.origin, "Missing code parameter."), 400);
      }

      const response = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: env.GITHUB_OAUTH_ID,
          client_secret: env.GITHUB_OAUTH_SECRET,
          code,
          redirect_uri: `${url.origin}/callback`,
          state,
        }),
      });

      const data = (await response.json()) as
        | { access_token: string; error?: never }
        | { error: string; error_description?: string };

      if ("error" in data) {
        return html(errorMessage(statePayload.origin, data.error_description || data.error), 400);
      }

      return html(successMessage(statePayload.origin, data.access_token));
    }

    return json({ message: "Not found." }, 404);
  },
};
