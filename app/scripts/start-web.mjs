/**
 * `expo start --web`, behind a proxy that makes the page cross-origin isolated.
 *
 * WHY THIS EXISTS
 *
 * `src/core/db/expoSqliteDriver.ts` uses expo-sqlite's *synchronous* API
 * (`execSync`, `getAllSync`, `getFirstSync`), because every repository in this
 * app is synchronous. In a browser those calls cross into a Web Worker through
 * `invokeWorkerSync`, which allocates a `SharedArrayBuffer` to block on the
 * result (`expo-sqlite/web/WorkerChannel.ts`, unconditionally — there is no
 * fallback path).
 *
 * `SharedArrayBuffer` only exists on a **cross-origin isolated** page, one
 * served with:
 *
 *   Cross-Origin-Opener-Policy:   same-origin
 *   Cross-Origin-Embedder-Policy: require-corp
 *
 * Without them the constructor is `undefined` and the first database call
 * throws. `AppNavigator` opens the database in a `useMemo` during its first
 * render, so plain `expo start --web` painted a blank white page.
 *
 * `vercel.json` sets these headers for the deployed site. The dev server is
 * hosting too, and Expo gives it no way to do the same: the HTML document is
 * served by the manifest middleware, which `MetroBundlerDevServer.js` *prepends*
 * to the stack, while a `metro.config.js` `server.enhanceMiddleware` hook is
 * appended after it (`instantiateMetro.js`). A config hook can never reach the
 * document. So the headers are added a layer out instead, by this proxy.
 *
 * The values are deliberately identical to `vercel.json`'s. Change one, change
 * both, or local and deployed stop agreeing about whether the database works.
 */

import { spawn } from 'node:child_process';
import http from 'node:http';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

const CROSS_ORIGIN_ISOLATION_HEADERS = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
};

/** The port you open. Expo itself is moved out of the way, onto PUBLIC + 100. */
const PUBLIC_PORT = Number(process.env.PORT ?? 8081);
const EXPO_PORT = PUBLIC_PORT + 100;
const EXPO_HOST = '127.0.0.1';

// BROWSER=none: better-opn treats it as "do not open", so Expo does not launch a
// tab on its own port — which would be the white screen this script exists to
// avoid. We print the proxied URL below instead.
const expo = spawn('npx', ['expo', 'start', '--web', '--port', String(EXPO_PORT)], {
  cwd: fileURLToPath(new URL('..', import.meta.url)),
  env: { ...process.env, BROWSER: 'none' },
  stdio: 'inherit',
  shell: true,
});

const proxy = http.createServer((req, res) => {
  const upstream = http.request(
    { host: EXPO_HOST, port: EXPO_PORT, path: req.url, method: req.method, headers: req.headers },
    response => {
      // Expo's own headers first, ours last: on the two names we care about,
      // this proxy is the authority.
      res.writeHead(response.statusCode ?? 502, {
        ...response.headers,
        ...CROSS_ORIGIN_ISOLATION_HEADERS,
      });
      response.pipe(res);
    },
  );

  // The window between this process starting and Metro listening is a few
  // seconds. Say so, rather than hanging or failing blank.
  upstream.on('error', error => {
    if (res.headersSent) return res.destroy();
    res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`The Expo dev server on port ${EXPO_PORT} is not answering yet.\n\n${error.message}\n`);
  });

  req.pipe(upstream);
});

// Metro's hot reload and log streams are WebSockets. http.request cannot carry
// an upgrade, so those connections are piped through as raw sockets.
proxy.on('upgrade', (req, socket, head) => {
  const upstream = net.connect(EXPO_PORT, EXPO_HOST, () => {
    const headers = [];
    for (let i = 0; i < req.rawHeaders.length; i += 2) {
      headers.push(`${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}`);
    }
    upstream.write(`${req.method} ${req.url} HTTP/${req.httpVersion}\r\n${headers.join('\r\n')}\r\n\r\n`);
    if (head?.length) upstream.write(head);
    upstream.pipe(socket);
    socket.pipe(upstream);
  });

  upstream.on('error', () => socket.destroy());
  socket.on('error', () => upstream.destroy());
});

// Without this the throw is unhandled, which kills this process and strands the
// Expo child it already spawned on EXPO_PORT.
proxy.on('error', error => {
  expo.kill();
  if (error.code === 'EADDRINUSE') {
    console.error(`\n  Port ${PUBLIC_PORT} is already in use — something else is serving it.`);
    console.error(`  Stop it, or pick another port:  PORT=8090 npm run web\n`);
  } else {
    console.error(error);
  }
  process.exit(1);
});

/**
 * Open the proxied URL ourselves.
 *
 * `BROWSER=none` above stops Expo opening a tab on ITS port, the one without
 * the isolation headers. But that left nothing opening at all, so the only
 * address on offer was the wrong one: Expo prints its own port, and pressing
 * `w` in its terminal opens that same wrong port. Landing on the right page by
 * default is the difference between this working and a "SharedArrayBuffer is
 * not defined" error that reads like an app bug.
 *
 * A user-set BROWSER=none is honoured — that means "do not open anything".
 */
function openBrowser(url) {
  if (process.env.BROWSER === 'none') return;
  const [command, args] =
    process.platform === 'win32'
      ? ['cmd', ['/c', 'start', '""', url]]
      : process.platform === 'darwin'
        ? ['open', [url]]
        : ['xdg-open', [url]];
  // Failing to open a browser must never take the dev server down with it.
  const child = spawn(command, args, { stdio: 'ignore', detached: true });
  child.on('error', () => console.log(`  (could not open a browser — open ${url} yourself)`));
  child.unref();
}

proxy.listen(PUBLIC_PORT, () => {
  const url = `http://localhost:${PUBLIC_PORT}`;
  console.log(`\n  Cross-origin isolated web app: ${url}\n`);
  console.log(`  (Expo is on ${EXPO_PORT}. Opening that port directly — including by`);
  console.log("   pressing 'w' in the Expo terminal — serves the page without the");
  console.log('   SharedArrayBuffer headers, which cannot open the database.)\n');
  openBrowser(url);
});

// One Ctrl-C should end both processes, not orphan Metro on EXPO_PORT.
const stop = () => {
  expo.kill();
  proxy.close();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
expo.on('exit', code => {
  proxy.close();
  process.exit(code ?? 0);
});
