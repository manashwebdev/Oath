const $ = (s) => document.querySelector(s);
const api = (p, o) => fetch('/api/' + p, { headers: { 'Content-Type': 'application/json' }, ...o }).then(r => r.json());
const esc = (s) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const COL = { overdue: '#ff5d73', soon: '#ffb84d', open: '#4de2ff', clear: '#5ee0a0' };
const tone = (p) => (p.overdue ? 'overdue' : !p.open ? 'clear' : p.nextDays <= 2 ? 'soon' : 'open');
let data = null, promises = [], nodes = [], hover = null, sel = null, t = 0, intro = 0;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

addEventListener('pointermove', e => { $('#aura').style.left = e.clientX + 'px'; $('#aura').style.top = e.clientY + 'px'; });

function countUp(el, to, suffix = '') {
  const t0 = performance.now();
  (function tick(t) { const p = Math.min((t - t0) / 900, 1); el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))) + suffix; if (p < 1) requestAnimationFrame(tick); })(t0);
}

// ---------- Orbit canvas ----------
const cv = $('#orbit'), ctx = cv.getContext('2d');
let W = 0, H = 0;
function fit() { const r = cv.getBoundingClientRect(), d = devicePixelRatio || 1; W = r.width; H = r.height; cv.width = W * d; cv.height = H * d; ctx.setTransform(d, 0, 0, d, 0, 0); }
addEventListener('resize', fit);

function layout() {
  const ppl = data.people;
  nodes = ppl.map((p, i) => {
    const k = tone(p), f = k === 'overdue' ? 0.3 : k === 'clear' ? 0.97 : 0.4 + 0.5 * Math.min(Math.max(p.nextDays, 0), 14) / 14;
    return { ...p, k, f, a: (i / ppl.length) * Math.PI * 2, sp: 0.1 / (0.6 + f), x: 0, y: 0, rad: 8 + p.open * 3 };
  });
  intro = 0;
}

function frame() {
  const cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2 - 34, e = 1 - Math.pow(1 - intro, 3);
  ctx.clearRect(0, 0, W, H);
  [0.3, 0.65, 0.97].forEach(f => { ctx.beginPath(); ctx.arc(cx, cy, R * f * e, 0, 7); ctx.strokeStyle = 'rgba(255,255,255,.06)'; ctx.setLineDash([3, 7]); ctx.stroke(); });
  ctx.setLineDash([]);
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 70 * e);
  g.addColorStop(0, 'rgba(77,226,255,.55)'); g.addColorStop(1, 'rgba(77,226,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 70 * e, 0, 7); ctx.fill();
  ctx.fillStyle = '#eafcff'; ctx.shadowColor = COL.open; ctx.shadowBlur = 24; ctx.beginPath(); ctx.arc(cx, cy, 11, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
  ctx.font = '600 12px Manrope'; ctx.textAlign = 'center'; ctx.fillStyle = '#85859a'; ctx.fillText('You', cx, cy + 30);
  nodes.forEach(n => {
    const ang = n.a + t * n.sp; n.x = cx + Math.cos(ang) * R * n.f * e; n.y = cy + Math.sin(ang) * R * n.f * e;
    const c = COL[n.k], pulse = n.k === 'overdue' ? Math.sin(t * 5) * 2.5 : 0, dim = sel && sel !== n.name ? 0.25 : 1;
    ctx.globalAlpha = dim * e;
    ctx.strokeStyle = c; ctx.lineWidth = 1; ctx.globalAlpha = dim * 0.12 * e; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(n.x, n.y); ctx.stroke();
    ctx.globalAlpha = dim * e; ctx.fillStyle = c; ctx.shadowColor = c; ctx.shadowBlur = hover === n ? 38 : 20 + pulse * 3;
    ctx.beginPath(); ctx.arc(n.x, n.y, n.rad + pulse + (hover === n ? 3 : 0), 0, 7); ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = '#c9c9d6'; ctx.font = '600 12px Manrope'; ctx.fillText(n.name.split(' (')[0], n.x, n.y + n.rad + 18);
    ctx.globalAlpha = 1;
  });
  if (intro < 1) intro = Math.min(1, intro + 0.025);
  if (!reduce) t += 0.016;
  requestAnimationFrame(frame);
}

const near = (e) => { const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top; return nodes.find(n => Math.hypot(n.x - x, n.y - y) < n.rad + 8); };
cv.onpointermove = e => {
  hover = near(e) || null; const tip = $('#tip');
  if (!hover) return void (tip.style.opacity = 0);
  const d = hover.nextDays, when = hover.open ? (d < 0 ? `overdue by ${-d}d` : d === 0 ? 'due today' : `next due in ${d}d`) : 'nothing owed';
  tip.innerHTML = `<b>${esc(hover.name)}</b><small>${hover.open} open · ${when}${hover.reliability !== null ? ' · ' + hover.reliability + '% kept' : ''}</small>`;
  tip.style.left = hover.x + 'px'; tip.style.top = hover.y - hover.rad + 'px'; tip.style.opacity = 1;
};
cv.onpointerleave = () => { hover = null; $('#tip').style.opacity = 0; };
cv.onclick = e => { const n = near(e); setSel(n && sel !== n.name ? n.name : null); };

// ---------- Panels ----------
function setSel(name) { sel = name; renderList(); $('#clear').hidden = !name; $('#clear').textContent = name ? `${name.split(' (')[0]} ✕` : ''; }
$('#clear').onclick = () => setSel(null);

function renderStats() {
  const s = data, cards = [['Trust score', s.reliability ?? 0, '%', 'hot'], ['Kept on time', s.kept, '', ''], ['Open', s.open, '', ''], ['Overdue', s.overdue, '', s.overdue ? 'bad' : '']];
  $('#stats').innerHTML = cards.map(c => `<div class="stat ${c[3]}"><b>0</b><span>${['Trust score · kept promises', 'Kept on time', 'Open promises', 'Overdue now'][cards.indexOf(c)]}</span></div>`).join('');
  document.querySelectorAll('.stat b').forEach((b, i) => countUp(b, cards[i][1], cards[i][2]));
  $('#verdict').textContent = s.verdict;
}
function renderTrust() {
  $('#trust').innerHTML = data.people.length ? data.people.map(p => `<div class="tr" data-n="${esc(p.name)}"><div><span>${esc(p.name)}</span><small>${p.reliability === null ? 'no history yet' : p.reliability + '% kept'} · ${p.open} open</small></div><div class="bar"><i style="--c:${p.reliability === null ? '#4de2ff' : p.reliability >= 80 ? COL.clear : p.reliability >= 50 ? COL.soon : COL.overdue}" data-w="${p.reliability ?? 100}"></i></div></div>`).join('') : '<p class="empty">Trust scores appear once you make promises.</p>';
  requestAnimationFrame(() => document.querySelectorAll('.bar i').forEach(i => i.style.width = i.dataset.w + '%'));
  $('#people').innerHTML = data.people.map(p => `<option value="${esc(p.name)}">`).join('');
}
function renderList() {
  const open = promises.filter(p => !p.result && (!sel || p.who === sel)).sort((a, b) => a.daysLeft - b.daysLeft);
  $('#list').innerHTML = open.length ? open.map((p, i) => {
    const d = p.daysLeft, c = d < 0 ? COL.overdue : d <= 2 ? COL.soon : COL.open, label = d < 0 ? `overdue ${-d}d` : d === 0 ? 'due today' : `in ${d}d`;
    return `<div class="item" style="animation-delay:${Math.min(i, 8) * 0.05}s"><p>${esc(p.what)}<br><small>for ${esc(p.who)} · due ${p.due}</small></p><span class="pill" style="--c:${c}">${label}</span>
      <div class="act"><button data-id="${p.id}" data-r="kept">Kept</button><button class="no" data-id="${p.id}" data-r="broken">Broke it</button></div><button class="x" data-del="${p.id}" aria-label="Delete promise">✕</button></div>`;
  }).join('') : '<p class="empty">No open promises. Add one above, or load demo data.<br><br><button class="btn" id="seed" style="padding:10px 18px">Load demo data</button></p>';
  const s = $('#seed'); if (s) s.onclick = async () => { await api('seed', { method: 'POST' }); load(); };
}

async function load() {
  [data, promises] = await Promise.all([api('overview'), api('promises')]);
  if (sel && !data.people.some(p => p.name === sel)) sel = null;
  renderStats(); renderTrust(); renderList(); layout(); $('#clear').hidden = !sel;
}

$('#trust').onclick = e => { const r = e.target.closest('.tr'); if (r) setSel(sel === r.dataset.n ? null : r.dataset.n); };
$('#form').onsubmit = async e => {
  e.preventDefault();
  const r = await api('promises', { method: 'POST', body: JSON.stringify({ who: $('#who').value, what: $('#what').value, due: $('#due').value }) });
  $('#err').textContent = r.error || '';
  if (!r.error) { $('#what').value = ''; load(); }
};
$('#list').onclick = async e => {
  const b = e.target;
  if (b.dataset.r) await api(`promises/${b.dataset.id}/resolve`, { method: 'POST', body: JSON.stringify({ result: b.dataset.r }) });
  else if (b.dataset.del) await api(`promises/${b.dataset.del}`, { method: 'DELETE' });
  else return;
  load();
};
const tm = new Date(Date.now() + 864e5); $('#due').value = tm.toLocaleDateString('en-CA');
fit(); load(); frame();
