/**
 * Local mock application used by the bundled samples (features/_samples) and unit tests.
 * Delete together with the samples (`npm run clean:samples`) once you point the framework at your own app.
 */
import http, { type IncomingMessage, type Server, type ServerResponse } from 'node:http';

const page = (title: string, body: string) =>
  `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title></head><body>${body}</body></html>`;

const LOGIN = page(
  'Sample Login',
  `<h2>Login Page</h2>
  <form id="login">
    <label>Username <input name="username" placeholder="Username"></label>
    <label>Password <input type="password" id="password" name="password"></label>
    <button type="submit">Log in</button>
  </form>
  <div id="flash"></div>
  <script>
    document.getElementById('login').addEventListener('submit', (e) => {
      e.preventDefault();
      const f = e.target;
      if (f.username.value === 'tomsmith' && f.password.value === 'sample-password') location.href = '/sample/secure';
      else document.getElementById('flash').textContent = 'Your username is invalid!';
    });
  </script>`,
);

const SECURE = page(
  'Sample Secure Area',
  `<h2>Secure Area</h2><div id="flash">You logged into a secure area!</div><a href="/sample/login">Logout</a>`,
);

const TABLE = page(
  'Sample Table',
  `<table><tr><td>John</td><td>Sydney</td></tr><tr><td>Jane</td><td>Melbourne</td></tr><tr><td>Raj</td><td>Kolkata</td></tr></table>
  <select id="country"><option value="au">Australia</option><option value="in">India</option></select>
  <a href="/sample/secure" target="_blank">Open secure area in new tab</a>`,
);

const SOAP_RESPONSE = (message: string) =>
  `<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body>` +
  `<ns:EchoResponse xmlns:ns="urn:sample"><ns:Status>OK</ns:Status><ns:Message>${message}</ns:Message></ns:EchoResponse>` +
  `</soap:Body></soap:Envelope>`;

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (c: Buffer) => (body += c.toString()));
    req.on('end', () => resolve(body));
  });
}

function send(res: ServerResponse, status: number, body: string | object, type?: string): void {
  const isJson = typeof body === 'object';
  res.writeHead(status, { 'Content-Type': type ?? (isJson ? 'application/json' : 'text/plain') });
  res.end(isJson ? JSON.stringify(body) : body);
}

export function startMockServer(port = Number(process.env.PORT ?? 3999)): Promise<Server> {
  let flakyCalls = 0;
  let tokenCalls = 0;

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', `http://localhost:${port}`);
    const route = `${req.method} ${url.pathname}`;
    const authorised = req.headers.authorization === 'Bearer sample-token';
    const body = await readBody(req);

    if (route === 'GET /health') return send(res, 200, 'ok');
    if (route === 'GET /sample/login') return send(res, 200, LOGIN, 'text/html');
    if (route === 'GET /sample/secure') return send(res, 200, SECURE, 'text/html');
    if (route === 'GET /sample/table') return send(res, 200, TABLE, 'text/html');
    if (route === 'GET /__stats') return send(res, 200, { tokenCalls, flakyCalls });

    if (route === 'POST /api/token') {
      tokenCalls++;
      const form = new URLSearchParams(body);
      const ok =
        form.get('grant_type') === 'client_credentials' &&
        form.get('client_id') === 'sample-client' &&
        form.get('client_secret') === 'sample-secret';
      return ok
        ? send(res, 200, { access_token: 'sample-token', token_type: 'Bearer', expires_in: 3600 })
        : send(res, 401, { error: 'invalid_client' });
    }
    if (route === 'POST /api/users') {
      if (!authorised) return send(res, 401, { error: 'unauthorised' });
      const { name } = JSON.parse(body || '{}') as { name?: string };
      return send(res, 201, { id: 'u-1', name });
    }
    const user = /^GET \/api\/users\/([^/]+)$/.exec(route);
    if (user) return send(res, 200, { id: decodeURIComponent(user[1]), name: 'Sample' });
    if (route === 'GET /api/flaky') return ++flakyCalls === 1 ? send(res, 503, 'try again') : send(res, 200, { ok: true });
    if (route === 'POST /api/flaky') return send(res, 503, 'always unavailable');

    if (route === 'POST /soap/echo') {
      const message = /<(?:\w+:)?Message>([\s\S]*?)<\/(?:\w+:)?Message>/.exec(body)?.[1] ?? '';
      return send(res, 200, SOAP_RESPONSE(message), 'text/xml; charset=utf-8');
    }
    return send(res, 404, `No mock route for ${route}`);
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, () => resolve(server));
  });
}

if (require.main === module) {
  void startMockServer().then((s) => console.log(`Mock server listening on ${JSON.stringify(s.address())}`));
}
