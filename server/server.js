const http = require('http'), fs = require('fs'), path = require('path');
const store = require('./store'), { overview, enrich } = require('./stats');
const PUB = path.join(__dirname, '..', 'public'), PORT = process.env.PORT || 4000;
const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' };

const send = (res, code, data) => {
  res.writeHead(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS' });
  res.end(code === 204 ? undefined : JSON.stringify(data));
};
const readBody = (req) => new Promise(resolve => {
  let raw = ''; req.on('data', c => { raw += c; if (raw.length > 1e5) req.destroy(); });
  req.on('end', () => { try { resolve(JSON.parse(raw || '{}')); } catch { resolve({}); } });
});

async function api(req, res, url) {
  const m = req.method, [, , resource, id, action] = url.split('/');
  if (m === 'OPTIONS') return send(res, 204);
  if (resource === 'promises') {
    if (m === 'GET' && !id) return send(res, 200, store.all().map(enrich));
    if (m === 'POST' && !id) {
      const b = await readBody(req), who = String(b.who || '').trim().slice(0, 40), what = String(b.what || '').trim().slice(0, 160);
      if (!who || !what || !/^\d{4}-\d{2}-\d{2}$/.test(b.due || '')) return send(res, 400, { error: 'Add who, what and a due date.' });
      return send(res, 201, enrich(store.add({ who, what, due: b.due })));
    }
    if (m === 'POST' && action === 'resolve') {
      const b = await readBody(req), p = ['kept', 'broken'].includes(b.result) ? store.resolve(id, b.result) : null;
      return p ? send(res, 200, enrich(p)) : send(res, 404, { error: 'Promise not found.' });
    }
    if (m === 'DELETE' && id) { store.remove(id); return send(res, 200, { ok: true }); }
  }
  if (resource === 'overview' && m === 'GET') return send(res, 200, overview(store.all()));
  if (resource === 'seed' && m === 'POST') { if (!store.all().length) store.seed(); return send(res, 200, { ok: true }); }
  send(res, 404, { error: 'Not found.' });
}

http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  if (url.startsWith('/api/')) return api(req, res, url);
  let file = path.join(PUB, url === '/' ? 'index.html' : url);
  if (!file.startsWith(PUB) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(PUB, 'index.html');
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'text/plain' });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`Oath running at http://localhost:${PORT}`));
