// Pure logic: promise status, per-person reliability, overall trust score.
const DAY = 864e5;
const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };
const dueMs = (p) => new Date(p.due + 'T00:00:00').getTime();
const score = (p) => (p.result === 'kept' ? (p.resolvedAt < dueMs(p) + DAY ? 1 : 0.5) : 0);
const daysLeft = (p) => Math.round((dueMs(p) - today()) / DAY);
const avg = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);

const enrich = (p) => {
  const d = daysLeft(p);
  const status = p.result ? (p.result === 'broken' ? 'broken' : score(p) === 1 ? 'kept' : 'late') : d < 0 ? 'overdue' : 'open';
  return { ...p, daysLeft: d, status };
};

exports.enrich = enrich;
exports.overview = (list) => {
  const items = list.map(enrich), resolved = items.filter(p => p.result), open = items.filter(p => !p.result);
  const names = [...new Set(items.map(p => p.who))];
  const people = names.map(name => {
    const mine = items.filter(p => p.who === name), o = mine.filter(p => !p.result).sort((a, b) => a.daysLeft - b.daysLeft);
    const rel = avg(mine.filter(p => p.result).map(score));
    return { name, open: o.length, overdue: o.filter(p => p.status === 'overdue').length, nextDays: o.length ? o[0].daysLeft : null, reliability: rel === null ? null : Math.round(rel * 100) };
  });
  const rel = avg(resolved.map(score));
  const risk = open.filter(p => p.daysLeft <= 2).length;
  const verdict = !resolved.length ? 'Log a promise and resolve it to start your trust score.'
    : rel >= 0.9 ? 'People can count on you. Keep it up.' : rel >= 0.7 ? 'Mostly reliable, but a few promises slipped.' : 'Promises are slipping. Clear the overdue ones first.';
  return { reliability: rel === null ? null : Math.round(rel * 100), kept: items.filter(p => p.status === 'kept').length, late: items.filter(p => p.status === 'late').length, broken: items.filter(p => p.status === 'broken').length,
    open: open.length, overdue: open.filter(p => p.daysLeft < 0).length, atRisk: risk, verdict, people };
};
