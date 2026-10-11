const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');

const PORT = 4300 + Math.floor(Math.random() * 500), BASE = `http://localhost:${PORT}/api`;
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oath-'));
let server;
const call = (p, method = 'GET', body) => fetch(`${BASE}/${p}`, { method, headers: { 'Content-Type': 'application/json' }, body: body && JSON.stringify(body) }).then(async r => ({ status: r.status, data: await r.json() }));
const due = new Date(Date.now() + 864e5 * 3).toLocaleDateString('en-CA');

test.before(() => new Promise((resolve, reject) => {
  server = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'server.js')], { env: { ...process.env, PORT, DB_FILE: path.join(dir, 'db.json') } });
  server.stdout.on('data', d => String(d).includes('running') && resolve());
  server.on('error', reject);
}));
test.after(() => { server.kill(); fs.rmSync(dir, { recursive: true, force: true }); });

test('rejects a promise with missing fields', async () => {
  const r = await call('promises', 'POST', { who: 'Neha', what: '', due });
  assert.equal(r.status, 400);
});

test('rejects a promise with a malformed date', async () => {
  const r = await call('promises', 'POST', { who: 'Neha', what: 'Review PR', due: 'tomorrow' });
  assert.equal(r.status, 400);
});

test('creates, lists, resolves and deletes a promise', async () => {
  const created = await call('promises', 'POST', { who: 'Neha', what: 'Review her PR', due });
  assert.equal(created.status, 201);
  assert.equal(created.data.status, 'open');

  const list = await call('promises');
  assert.equal(list.data.length, 1);

  const resolved = await call(`promises/${created.data.id}/resolve`, 'POST', { result: 'kept' });
  assert.equal(resolved.data.status, 'kept');

  const ov = await call('overview');
  assert.equal(ov.data.reliability, 100);

  await call(`promises/${created.data.id}`, 'DELETE');
  assert.equal((await call('promises')).data.length, 0);
});

test('rejects an invalid resolve result', async () => {
  const c = await call('promises', 'POST', { who: 'Sana', what: 'Send feedback', due });
  const r = await call(`promises/${c.data.id}/resolve`, 'POST', { result: 'maybe' });
  assert.equal(r.status, 404);
});

test('seed loads demo data only when the store is empty', async () => {
  await call('promises', 'POST', { who: 'Extra', what: 'Keep me', due });
  const before = (await call('promises')).data.length;
  await call('seed', 'POST');
  assert.equal((await call('promises')).data.length, before);
});
