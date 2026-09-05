function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function renderErrorPage(error?: unknown): string {
  const isDev = process.env.NODE_ENV !== "production";

  if (isDev && error != null) {
    const err = error instanceof Error ? error : new Error(String(error));
    const detail = escapeHtml([err.message, err.stack].filter(Boolean).join("\n\n"));

    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Development error</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { font: 14px/1.5 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; background: #0b0b0c; color: #f4f4f5; margin: 0; padding: 1.5rem; }
      h1 { font: 600 1.1rem system-ui, sans-serif; margin: 0 0 0.75rem; color: #fca5a5; }
      pre { white-space: pre-wrap; word-break: break-word; background: #18181b; border: 1px solid #3f3f46; border-radius: 0.75rem; padding: 1rem; margin: 0 0 1rem; user-select: all; }
      .hint { font: 12px/1.4 system-ui, sans-serif; color: #a1a1aa; margin-bottom: 1rem; }
      .actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
      a, button { font: 500 13px system-ui, sans-serif; padding: 0.5rem 0.9rem; border-radius: 0.375rem; cursor: pointer; text-decoration: none; border: 1px solid #3f3f46; background: #27272a; color: #fafafa; }
      button { background: #fafafa; color: #18181b; border-color: #fafafa; }
    </style>
  </head>
  <body>
    <h1>Development error</h1>
    <p class="hint">Full server error for debugging. Production shows a friendly message only.</p>
    <pre>${detail}</pre>
    <div class="actions">
      <button onclick="location.reload()">Try again</button>
      <a href="/">Go home</a>
    </div>
  </body>
</html>`;
  }

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>This page didn't load</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { font: 15px/1.5 system-ui, -apple-system, sans-serif; background: #fafafa; color: #111; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 1.5rem; }
      .card { max-width: 28rem; width: 100%; text-align: center; padding: 2rem; }
      h1 { font-size: 1.25rem; margin: 0 0 0.5rem; }
      p { color: #4b5563; margin: 0 0 1.5rem; }
      .actions { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; }
      a, button { padding: 0.5rem 1rem; border-radius: 0.375rem; font: inherit; cursor: pointer; text-decoration: none; border: 1px solid transparent; }
      .primary { background: #111; color: #fff; }
      .secondary { background: #fff; color: #111; border-color: #d1d5db; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>This page didn't load</h1>
      <p>Something went wrong on our end. You can try refreshing or head back home.</p>
      <div class="actions">
        <button class="primary" onclick="location.reload()">Try again</button>
        <a class="secondary" href="/">Go home</a>
      </div>
    </div>
  </body>
</html>`;
}
