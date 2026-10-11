const test = require('node:test');
const assert = require('node:assert/strict');
const { enrich, overview } = require('../server/stats');

// Local YYYY-MM-DD for "today + n days" (matches how the server reads due dates).
const day = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const promise = (who, due, result = null) => ({ id: who + due, who, what: 'x', due: day(due), result, resolvedAt: result ? Date.now() : null });

test('open promise in the future is "open" with positive daysLeft', () => {
  const p = enrich(promise('A', 3));
  assert.equal(p.status, 'open');
  assert.equal(p.daysLeft, 3);
});

test('unresolved promise past its due date is "overdue"', () => {
  const p = enrich(promise('A', -2));
  assert.equal(p.status, 'overdue');
  assert.equal(p.daysLeft, -2);
});

test('promise due today is still "open"', () => {
  assert.equal(enrich(promise('A', 0)).status, 'open');
});

test('kept on time, kept late and broken get distinct statuses', () => {
  assert.equal(enrich(promise('A', 0, 'kept')).status, 'kept');
  assert.equal(enrich(promise('A', -3, 'kept')).status, 'late');
  assert.equal(enrich(promise('A', 0, 'broken')).status, 'broken');
});

test('trust score weights kept=1, late=0.5, broken=0', () => {
  const o = overview([promise('A', 0, 'kept'), promise('A', -3, 'kept'), promise('A', 0, 'broken')]);
  assert.equal(o.reliability, 50); // (1 + 0.5 + 0) / 3
  assert.deepEqual([o.kept, o.late, o.broken], [1, 1, 1]);
});

test('empty list gives a null score and a starter message', () => {
  const o = overview([]);
  assert.equal(o.reliability, null);
  assert.match(o.verdict, /Log a promise/);
});

test('people are grouped with open and overdue counts and a reliability score', () => {
  const o = overview([promise('Neha', 2), promise('Neha', -1), promise('Neha', 0, 'kept'), promise('Sana', 5)]);
  const neha = o.people.find(p => p.name === 'Neha'), sana = o.people.find(p => p.name === 'Sana');
  assert.equal(neha.open, 2);
  assert.equal(neha.overdue, 1);
  assert.equal(neha.nextDays, -1);
  assert.equal(neha.reliability, 100);
  assert.equal(sana.reliability, null);
  assert.equal(o.overdue, 1);
});

test('verdict reflects the score band', () => {
  assert.match(overview([promise('A', 0, 'kept')]).verdict, /count on you/);
  assert.match(overview([promise('A', 0, 'broken')]).verdict, /slipping/);
});
