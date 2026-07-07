// / - Arinara Network © 2026 - /
// This source code is the exclusive property of Arinara Network.
// Unauthorized use, reproduction, distribution, or modification of this
// code — in whole or in part — for any purpose whatsoever is strictly
// prohibited without prior written consent from Arinara Network as the
// sole legal owner of this codebase.
interface FatalErrorPayload {
  title: string;
  message: string;
  stack: string;
  source: string;
}

let installed = false;
let overlayElement: HTMLElement | null = null;

export function installFatalErrorSurface() {
  if (installed || typeof window === 'undefined') {
    return;
  }

  installed = true;
  window.addEventListener('error', (event) => {
    showFatalError({
      title: 'Fatal Error',
      message: event.message || stringifyUnknownError(event.error),
      stack: getErrorStack(event.error),
      source: formatErrorSource(event.filename, event.lineno, event.colno),
    });
  });
  window.addEventListener('unhandledrejection', (event) => {
    showFatalError({
      title: 'Unhandled Promise Rejection',
      message: stringifyUnknownError(event.reason),
      stack: getErrorStack(event.reason),
      source: 'window.unhandledrejection',
    });
  });
}

function showFatalError(payload: FatalErrorPayload) {
  const documentRef = window.document;
  overlayElement?.remove();
  overlayElement = documentRef.createElement('section');
  overlayElement.className = 'fatal-error-surface';
  overlayElement.setAttribute('role', 'alertdialog');
  overlayElement.setAttribute('aria-modal', 'true');
  overlayElement.setAttribute('aria-label', payload.title);
  overlayElement.innerHTML = `
    <div class="fatal-error-panel">
      <div class="fatal-error-heading">
        <span>${escapeHtml(payload.title)}</span>
        <button type="button" class="fatal-error-dismiss" aria-label="Dismiss fatal error">Dismiss</button>
      </div>
      <strong>${escapeHtml(payload.message)}</strong>
      <em>${escapeHtml(payload.source)}</em>
      <pre>${escapeHtml(payload.stack || payload.message)}</pre>
      <button type="button" class="fatal-error-copy">Copy error</button>
    </div>
  `;
  installFatalErrorStyles(documentRef);
  documentRef.body.append(overlayElement);

  overlayElement.querySelector('.fatal-error-dismiss')?.addEventListener('click', () => {
    overlayElement?.remove();
    overlayElement = null;
  });
  overlayElement.querySelector('.fatal-error-copy')?.addEventListener('click', async () => {
    const text = [payload.title, payload.message, payload.source, payload.stack].filter(Boolean).join('\n\n');
    try {
      await window.navigator.clipboard?.writeText(text);
    } catch {
      // The popup still displays the full verbatim error when clipboard access is unavailable.
    }
  });
}

function installFatalErrorStyles(documentRef: Document) {
  if (documentRef.getElementById('fatal-error-surface-style')) {
    return;
  }

  const style = documentRef.createElement('style');
  style.id = 'fatal-error-surface-style';
  style.textContent = `
    .fatal-error-surface {
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      display: grid;
      place-items: center;
      background: rgba(0, 0, 0, 0.78);
      color: #fff;
      font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      padding: 22px;
    }
    .fatal-error-panel {
      width: min(760px, calc(100vw - 28px));
      max-height: calc(100vh - 32px);
      overflow: auto;
      border: 1px solid #7f1d1d;
      border-radius: 10px;
      background: #0b0d11;
      box-shadow: 0 30px 90px rgba(0, 0, 0, 0.7);
      padding: 16px;
    }
    .fatal-error-heading {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 12px;
    }
    .fatal-error-heading span {
      color: #fca5a5;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }
    .fatal-error-panel strong {
      display: block;
      color: #fff;
      font-size: 14px;
      line-height: 1.45;
      margin-bottom: 8px;
      white-space: pre-wrap;
    }
    .fatal-error-panel em {
      display: block;
      color: #a1a1aa;
      font-size: 11px;
      font-style: normal;
      font-weight: 750;
      margin-bottom: 10px;
    }
    .fatal-error-panel pre {
      max-height: 360px;
      overflow: auto;
      border: 1px solid #262b36;
      border-radius: 8px;
      background: #050608;
      color: #f4f4f5;
      font-family: "JetBrains Mono", Consolas, monospace;
      font-size: 11px;
      line-height: 1.5;
      margin: 0 0 12px;
      padding: 12px;
      white-space: pre-wrap;
    }
    .fatal-error-dismiss,
    .fatal-error-copy {
      border: 1px solid #303642;
      border-radius: 8px;
      background: #15181f;
      color: #f4f4f5;
      cursor: pointer;
      font-size: 12px;
      font-weight: 850;
      padding: 8px 10px;
    }
    .fatal-error-copy {
      background: #fff;
      color: #050608;
    }
  `;
  documentRef.head.append(style);
}

function stringifyUnknownError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function getErrorStack(error: unknown) {
  return error instanceof Error && typeof error.stack === 'string' ? error.stack : '';
}

function formatErrorSource(filename: string, lineNumber: number, columnNumber: number) {
  return [filename, lineNumber ? `${lineNumber}:${columnNumber || 0}` : ''].filter(Boolean).join(' ');
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
