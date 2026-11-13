/*! coi-serviceworker v0.1.7 - Guido Zuidhof and contributors - MIT License */
let coepCredentialless = false;
if (typeof window === 'undefined') {
  self.addEventListener('install', () => self.skipWaiting());
  self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

  self.addEventListener('message', (ev) => {
    if (!ev.data) return;
    if (ev.data.type === 'deregister') {
      self.registration
        .unregister()
        .then(() => self.clients.matchAll())
        .then((clients) => {
          clients.forEach((client) => client.navigate(client.url));
        });
    } else if (ev.data.type === 'coepCredentialless') {
      coepCredentialless = ev.data.value;
    }
  });

  self.addEventListener('fetch', function (event) {
    const r = event.request;
    if (r.cache === 'only-if-cached' && r.mode !== 'same-origin') {
      return;
    }

    const coep = coepCredentialless ? 'credentialless' : 'require-corp';

    event.respondWith(
      fetch(r).then((response) => {
        if (response.status === 0) {
          return response;
        }

        const newHeaders = new Headers(response.headers);
        newHeaders.set('Cross-Origin-Embedder-Policy', coep);
        newHeaders.set('Cross-Origin-Opener-Policy', 'same-origin');

        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: newHeaders,
        });
      })
    );
  });
} else {
  (() => {
    const coi = {
      shouldRegister: () => true,
      shouldDeregister: () => false,
      coepCredentialless: () => false,
      doReload: () => window.location.reload(),
      quiet: false,
      ...(window.coi || {}),
    };

    const n = navigator;
    if (n.serviceWorker && n.serviceWorker.controller) {
      n.serviceWorker.controller.postMessage({
        type: 'coepCredentialless',
        value: coi.coepCredentialless(),
      });

      if (coi.shouldDeregister()) {
        n.serviceWorker.controller.postMessage({ type: 'deregister' });
      }
    }

    if (window.crossOriginIsolated !== false) {
      return;
    }

    const currentScript = document.currentScript;
    const scriptUrl = currentScript ? currentScript.src : window.location.href;

    if (coi.shouldRegister() && n.serviceWorker) {
      n.serviceWorker.register(scriptUrl).then(
        (registration) => {
          if (!coi.quiet) console.log('COI Service Worker registered: ', registration.scope);

          registration.addEventListener('updatefound', () => {
            if (!coi.quiet) console.log('Reloading page to activate COI Service Worker.');
            coi.doReload();
          });

          if (registration.active && !n.serviceWorker.controller) {
            if (!coi.quiet) console.log('Reloading page to activate COI Service Worker.');
            coi.doReload();
          }
        },
        (err) => {
          if (!coi.quiet) console.error('COI Service Worker failed to register: ', err);
        }
      );
    }
  })();
}
