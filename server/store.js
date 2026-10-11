const fs = require('fs'), path = require('path'), crypto = require('crypto');
const FILE = process.env.DB_FILE || path.join(__dirname, '..', 'data', 'db.json');
let db = [];
try { db = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch {}
const save = () => { fs.mkdirSync(path.dirname(FILE), { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(db, null, 2)); };
exports.all = () => [...db];
exports.add = (p) => { const r = { id: crypto.randomUUID(), ...p, result: null, createdAt: Date.now(), resolvedAt: null }; db.push(r); save(); return r; };
exports.resolve = (id, result) => { const p = db.find(x => x.id === id); if (!p) return null; p.result = result; p.resolvedAt = Date.now(); save(); return p; };
exports.remove = (id) => { db = db.filter(x => x.id !== id); save(); };

exports.seed = () => {
  const D = 864e5, now = Date.now(), iso = (d) => new Date(now + d * D).toISOString().slice(0, 10);
  // [who, what, dueOffsetDays, result, resolvedOffsetDays]
  const rows = [
    ['Aarav (Client)', 'Send the revised landing page', -2, null], ['Aarav (Client)', 'Share the invoice', 3, null],
    ['Neha', 'Review her pull request', 1, null], ['Neha', 'Return the borrowed charger', -5, 'kept', -5],
    ['Rohan', 'Reply about the freelance gig', 0, null], ['Rohan', 'Send the portfolio link', -9, 'kept', -9],
    ['Coach Vikram', 'Share the training video', 6, null], ['Coach Vikram', 'Confirm Saturday session', -4, 'kept', -2],
    ['Team Mannecx', 'Post the scrim schedule', 2, null], ['Team Mannecx', 'Review last match footage', -7, 'broken', -3],
    ['Sana', 'Send the design feedback', 10, null], ['Sana', 'Join the call on time', -12, 'kept', -12],
    ['Priya', 'Deliver the API docs', -1, null], ['Priya', 'Fix the login bug', -14, 'kept', -14],
  ];
  rows.forEach(([who, what, off, result, rOff]) => db.push({ id: crypto.randomUUID(), who, what, due: iso(off), result, createdAt: now - 20 * D, resolvedAt: result ? now + rOff * D : null }));
  save();
};
