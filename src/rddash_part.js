// ---------- RED DEAL DASHBOARD (Phase 1: auto dashboard) ----------
let rdM = null;
const rdLatest = t => S.datasets.filter(d => d.t === t).sort((a, b) => (b.at || 0) - (a.at || 0))[0] || null;
function rdScopes() {
  const names = myNames(), me = NX.meTest(names), reg = NX.myRegions(S.datasets, names);
  const out = [{ k: 'me', label: S.settings.owner + ' (me)', f: r => me(r), col: css('--good') }];
  if (reg.bdm) out.push({ k: 'bdm', label: reg.bdm, f: r => r.bdm === reg.bdm, col: css('--accent') });
  if (reg.rh) out.push({ k: 'rh', label: reg.rh, f: r => r.rh === reg.rh, col: css('--violet') });
  return { out, reg, me };
}
function rdAgg(rows, f, ms) {
  const x = rows.filter(f);
  return ms.map(m => { const y = x.filter(r => r.m === m); const seats = NX.sum(y, r => r.seats), rd10 = NX.sum(y, r => r.rd10);
    return { m, seats, rd10, rdSeats: NX.sum(y, r => r.rdSeats), gmv: NX.sum(y, r => r.gmv), disc: NX.sum(y, r => r.disc), pct: seats ? rd10 / seats * 100 : null, ops: new Set(y.map(r => r.vid)).size }; });
}
function rdDash() {
  const d = rdLatest('rd_month'); if (!d) return null;
  const ms = [...new Set(d.rows.map(r => r.m))].sort(); if (!rdM || !ms.includes(rdM)) rdM = ms[ms.length - 1];
  const sc = rdScopes(); const series = sc.out.map(s => Object.assign({}, s, { months: rdAgg(d.rows, s.f, ms) }));
  const tg = M.kpi.rd10Target ?? null, tgFrom = M.kpi.rd10TargetFrom || '';
  return { d, ms, sc, series, tg, tgFrom, day: rdLatest('rd_day') };
}
function vRdDash() {
  const D = rdDash();
  const hd = head('Red Deal dashboard', { eyebrow: 'Auto-updates on every upload', text: 'Red Deal 10%+ share and Red Deal revenue — your rows only, compared with your BDM and RH regions.' });
  if (!D) return hd + `<div class="empty">Upload the Red Deal dashboard file (10% and above). This page fills itself the moment the file is read — no clicks needed.</div><div class="actions"><button class="btn primary" data-go="upload">Upload the file</button></div>`;
  const i = D.ms.indexOf(rdM), me = D.series[0], cur = me.months[i], prev = i > 0 ? me.months[i - 1] : null;
  const part = D.d.last && rdM === D.ms[D.ms.length - 1] && rdM === curMonth() ? ' MTD' : '';
  const lb = D.sc.reg.bdm ? NX.rdLeaderboard(S.datasets, { level: 'bdm', value: D.sc.reg.bdm }, myNames(), rdM) : [];
  const rank = lb.findIndex(o => o.mine) + 1;
  const dpts = (a, b) => a === null || b === null || b === undefined ? '' : `<span class="delta ${a - b >= 0 ? 'up' : 'down'}">${a - b >= 0 ? '▲' : '▼'} ${Math.abs(a - b).toFixed(2)} pts</span>`;
  const dpc = (a, b) => !b ? '' : `<span class="delta ${a - b >= 0 ? 'up' : 'down'}">${a - b >= 0 ? '▲' : '▼'} ${Math.abs((a - b) / b * 100).toFixed(1)}%</span>`;
  const need = cur.pct !== null && D.tg !== null && cur.pct < D.tg ? Math.ceil(D.tg / 100 * cur.seats - cur.rd10) : 0;
  const log = (S.refreshLog || []).filter(l => /^rd_/.test(l.t)).slice(0, 5);
  return hd + `
  <div class="rdbar">
    <div class="seg" role="group" aria-label="Month">${D.ms.map(m => `<button data-rdm="${m}" aria-pressed="${m === rdM}">${monLbl(m).slice(0, 3)} ${m.slice(2, 4)}</button>`).join('')}</div>
    <span class="muted rdsrc">Data till ${D.d.last ? new Date(D.d.last.slice(0, 10) + 'T00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '–'} · ${esc(D.d.file || '')} · updated ${new Date(D.d.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
  </div>
  <div class="tiles">
    <div class="tile"><span class="eyebrow">Red Deal 10%+ share · ${monLbl(rdM).slice(0, 3)}${part}</span><span class="v ${D.tg !== null && cur.pct !== null ? (cur.pct >= D.tg ? 'good' : 'bad') : ''}">${pctH(cur.pct, 2)}</span><span class="s">${prev ? dpts(cur.pct, prev.pct) + ' vs ' + monLbl(prev.m).slice(0, 3) + ' · ' : ''}target ${D.tg !== null ? D.tg + '%' : '–'}</span></div>
    <div class="tile"><span class="eyebrow">Red Deal revenue (GMV)</span><span class="v">${inrH(cur.gmv)}</span><span class="s">${prev ? dpc(cur.gmv, prev.gmv) + ' vs ' + monLbl(prev.m).slice(0, 3) : 'GMV on Red Deal seats'}</span></div>
    <div class="tile"><span class="eyebrow">Red Deal seats</span><span class="v">${fmt(cur.rdSeats)}</span><span class="s">${fmt(cur.rd10)} at 10%+ · of ${fmt(cur.seats)} B2C seats</span></div>
    <div class="tile"><span class="eyebrow">Discount given</span><span class="v">${inrH(cur.disc)}</span><span class="s">${cur.rdSeats ? '₹' + fmt(Math.round(cur.disc / cur.rdSeats)) + ' per Red Deal seat' : ''}</span></div>
    <div class="tile ${need ? 'warn' : 'good'}"><span class="eyebrow">To reach target</span><span class="v">${need ? fmt(need) : '✓'}</span><span class="s">${need ? (rdM === D.ms[D.ms.length - 1] ? 'more 10%+ seats this month' : '10%+ seats short in ' + monLbl(rdM).slice(0, 3)) : 'target reached'}${rank ? ` · rank #${rank} of ${lb.length}` : ''}</span></div>
  </div>
  <div class="cmpstrip">${D.series.map((s, j) => { const x = s.months[i]; return `<div class="cmpc"><span class="dot" style="background:${s.col}"></span><span class="nm">${esc(s.label)}</span><b>${pct(x.pct, 2)}</b>${j ? `<small class="${me.months[i].pct >= x.pct ? 'good' : 'bad'}">you ${me.months[i].pct - x.pct >= 0 ? '+' : ''}${(me.months[i].pct - x.pct).toFixed(2)} pts</small>` : `<small class="muted">${x.ops} operators</small>`}</div>`; }).join('')}</div>
  <div class="dgrid">
    <section class="card"><div class="card-h"><h2>Share by month</h2><span class="muted">RD 10%+ seats ÷ B2C seats</span></div><div class="chart" id="rdc-trend"></div></section>
    <section class="card"><div class="card-h"><h2>Daily share · ${monLbl(rdM)}</h2><span class="muted">day by day</span></div><div class="chart" id="rdc-day"></div></section>
    <section class="card"><div class="card-h"><h2>Red Deal revenue by month</h2><span class="muted">your operators · GMV and discount</span></div><div class="chart" id="rdc-rev"></div></section>
    <section class="card"><div class="card-h"><h2>Your operators · ${monLbl(rdM).slice(0, 3)}</h2><span class="muted">share vs target</span></div><div class="chart" id="rdc-ops"></div></section>
    <section class="card wide"><div class="card-h"><h2>Operator × month heatmap</h2><span class="muted">Red Deal 10%+ share · green = above target</span></div><div class="chart" id="rdc-heat"></div></section>
    ${lb.length ? `<section class="card wide"><div class="card-h"><h2>BDE ranking · ${esc(D.sc.reg.bdm)} · ${monLbl(rdM).slice(0, 3)}</h2><span class="pill ${rank && rank <= Math.ceil(lb.length / 2) ? 'good' : 'warn'}">${rank ? '#' + rank + ' of ' + lb.length : ''}</span></div><div class="chart" id="rdc-lb"></div></section>` : ''}
  </div>
  <section class="card"><div class="card-h"><h2>Refresh log</h2><span class="muted">last uploads of this report</span></div>
    ${log.length ? `<div class="tbl-wrap"><table><thead><tr><th>When</th><th>Report</th><th>File</th><th>Source</th><th class="n">Rows</th><th>Status</th></tr></thead><tbody>${log.map(l => `<tr><td class="mono">${new Date(l.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td><td>${esc(l.label || l.t)}</td><td>${esc(l.file)}</td><td>${esc(l.source || 'Manual upload')}</td><td class="n">${l.rows ? fmt(l.rows) : '–'}</td><td><span class="pill ${l.status === 'ok' ? 'good' : l.status === 'dup' ? '' : 'warn'}">${l.status === 'ok' ? 'Updated' : l.status === 'dup' ? 'Duplicate — ignored' : 'Columns changed'}</span></td></tr>`).join('')}</tbody></table></div>` : '<p class="muted" style="margin:0">Uploads from now on are logged here.</p>'}
  </section>`;
}
function rdOpLbl(vids) { const n = vids.map(v => opName(v)); return vids.map((v, i) => { let x = n[i]; if (n.filter(y => y === x).length > 1) x += ' · ' + v; return x.length > 30 ? x.slice(0, 29) + '…' : x; }); }
function rdBase(c) { const mu = css('--muted'), ln = css('--line'), fg = css('--fg'); return { mu, ln, fg, tip: { backgroundColor: css('--panel'), borderColor: ln, textStyle: { color: fg } } }; }
afterRender.rddash = () => {
  document.querySelectorAll('[data-rdm]').forEach(b => b.addEventListener('click', () => { rdM = b.dataset.rdm; const y = window.scrollY; render(); window.scrollTo(0, y); }));
  const D = rdDash(); if (!D || !window.echarts) return;
  const mk = id => { const el = $('#' + id); if (!el) return null; const c = echarts.init(el, null, { renderer: 'svg' }); charts.push(c); return c; };
  const B = rdBase(), i = D.ms.indexOf(rdM), xl = D.ms.map(m => monLbl(m).slice(0, 3) + (m === curMonth() ? ' MTD' : ''));
  const axis = (data) => ({ type: 'category', data, axisLabel: { color: B.mu }, axisLine: { lineStyle: { color: B.ln } }, axisTick: { show: false } });
  const yPct = { type: 'value', scale: true, splitLine: { lineStyle: { color: B.ln } }, axisLabel: { color: B.mu, formatter: '{value}%' } };
  const legend = { top: 0, textStyle: { color: B.mu, fontSize: 12 }, icon: 'roundRect', itemWidth: 10, itemHeight: 10 };
  const tgLine = D.tg === null ? undefined : { symbol: 'none', silent: true, lineStyle: { color: css('--amber'), type: 'dashed' }, label: { position: 'insideEndTop', color: css('--amber'), formatter: 'Target ' + D.tg + '%' }, data: [{ yAxis: D.tg }] };
  let c = mk('rdc-trend');
  if (c) c.setOption({ grid: { left: 8, right: 16, top: 34, bottom: 6, containLabel: true }, legend, tooltip: Object.assign({ trigger: 'axis', valueFormatter: v => v === null ? '–' : v + '%' }, B.tip), xAxis: axis(xl), yAxis: yPct,
    series: D.series.map((s, j) => ({ name: s.label, type: 'line', smooth: true, data: s.months.map(x => x.pct === null ? null : +x.pct.toFixed(2)), symbolSize: j ? 5 : 8, lineStyle: { width: j ? 1.8 : 3, color: s.col }, itemStyle: { color: s.col }, markLine: j ? undefined : tgLine })) });
  c = mk('rdc-day');
  if (c && D.day) {
    const days = [...new Set(D.day.rows.filter(r => r.m === rdM).map(r => r.d))].sort();
    c.setOption({ grid: { left: 8, right: 16, top: 34, bottom: 6, containLabel: true }, legend, tooltip: Object.assign({ trigger: 'axis', valueFormatter: v => v === null ? '–' : v + '%' }, B.tip), xAxis: axis(days.map(d => d.slice(8, 10))), yAxis: yPct,
      series: D.series.map((s, j) => { const x = D.day.rows.filter(r => r.m === rdM && s.f(r)); const by = new Map(); x.forEach(r => { const o = by.get(r.d) || [0, 0]; o[0] += r.seats; o[1] += r.rd10; by.set(r.d, o); });
        return { name: s.label, type: 'line', smooth: true, showSymbol: days.length < 12, data: days.map(dd => { const o = by.get(dd); return o && o[0] ? +(o[1] / o[0] * 100).toFixed(2) : null; }), lineStyle: { width: j ? 1.6 : 2.6, color: s.col }, itemStyle: { color: s.col }, markLine: j ? undefined : tgLine }; }) });
  }
  c = mk('rdc-rev');
  if (c) { const me = D.series[0].months; c.setOption({ grid: { left: 8, right: 8, top: 34, bottom: 6, containLabel: true }, legend, tooltip: Object.assign({ trigger: 'axis', valueFormatter: v => inr(v) }, B.tip), xAxis: axis(xl),
    yAxis: { type: 'value', splitLine: { lineStyle: { color: B.ln } }, axisLabel: { color: B.mu, formatter: v => v >= 1e7 ? '₹' + (v / 1e7).toFixed(1) + ' Cr' : v >= 1e5 ? '₹' + (v / 1e5).toFixed(0) + ' L' : v >= 1e3 ? '₹' + (v / 1e3).toFixed(0) + 'k' : v } },
    series: [{ name: 'Red Deal GMV', type: 'bar', barMaxWidth: 34, data: me.map((x, j) => ({ value: Math.round(x.gmv), itemStyle: { color: j === i ? css('--accent') : css('--accent') + '88', borderRadius: [5, 5, 0, 0] } })) },
      { name: 'Discount', type: 'line', smooth: true, data: me.map(x => Math.round(x.disc)), lineStyle: { color: css('--amber'), width: 2 }, itemStyle: { color: css('--amber') } }] }); }
  c = mk('rdc-ops');
  if (c) { const me = D.sc.me; let ops = D.d.rows.filter(r => r.m === rdM && me(r) && r.seats >= 50).map(r => ({ v: r.vid, n: opName(r.vid, r.bo), p: r.seats ? r.rd10 / r.seats * 100 : 0, s: r.seats })).sort((a, b) => a.p - b.p);
    const el = $('#rdc-ops'); el.style.height = Math.max(240, ops.length * 26 + 40) + 'px'; c.resize();
    c.setOption({ grid: { left: 8, right: 52, top: 6, bottom: 6, containLabel: true }, tooltip: Object.assign({ trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: p => `${p[0].name}<br>${p[0].value}% · ${fmt(ops[p[0].dataIndex].s)} seats` }, B.tip),
      xAxis: { type: 'value', splitLine: { lineStyle: { color: B.ln } }, axisLabel: { color: B.mu, formatter: '{value}%' } }, yAxis: { type: 'category', data: rdOpLbl(ops.map(o => o.v)), axisLabel: { color: B.fg, fontSize: 11 }, axisTick: { show: false }, axisLine: { lineStyle: { color: B.ln } } },
      series: [{ type: 'bar', barMaxWidth: 14, data: ops.map(o => ({ value: +o.p.toFixed(1), itemStyle: { color: D.tg !== null && o.p >= D.tg ? css('--good') : css('--bad'), borderRadius: [0, 4, 4, 0] } })), label: { show: true, position: 'right', color: B.mu, fontSize: 11, formatter: '{c}%' },
        markLine: D.tg === null ? undefined : { symbol: 'none', silent: true, lineStyle: { color: css('--amber'), type: 'dashed' }, label: { color: css('--amber'), formatter: D.tg + '%' }, data: [{ xAxis: D.tg }] } }] }); }
  c = mk('rdc-heat');
  if (c) { const me = D.sc.me, mine = D.d.rows.filter(r => me(r)); const opsAll = [...new Set(mine.map(r => r.vid))];
    const tot = v => NX.sum(mine.filter(r => r.vid === v), r => r.seats); const ops = opsAll.filter(v => tot(v) >= 200).sort((a, b) => tot(a) - tot(b));
    const data = []; ops.forEach((v, y) => D.ms.forEach((m, x) => { const r = mine.find(q => q.vid === v && q.m === m); if (r && r.seats) data.push([x, y, +(r.rd10 / r.seats * 100).toFixed(1)]); }));
    const el = $('#rdc-heat'); el.style.height = Math.max(260, ops.length * 24 + 70) + 'px'; c.resize();
    const t = D.tg ?? 22;
    c.setOption({ grid: { left: 8, right: 8, top: 6, bottom: 44, containLabel: true }, tooltip: Object.assign({ formatter: p => `${opName(ops[p.value[1]])}<br>${xl[p.value[0]]}: ${p.value[2]}%` }, B.tip),
      xAxis: Object.assign(axis(xl), { splitArea: { show: false } }), yAxis: { type: 'category', data: rdOpLbl(ops), axisLabel: { color: B.fg, fontSize: 11 }, axisTick: { show: false }, axisLine: { show: false } },
      visualMap: { type: 'piecewise', orient: 'horizontal', left: 'center', bottom: 0, textStyle: { color: B.mu }, pieces: [{ lt: t - 5, label: '< ' + (t - 5) + '%', color: css('--bad') }, { gte: t - 5, lt: t, label: 'near target', color: css('--amber') }, { gte: t, label: '≥ ' + t + '%', color: css('--good') }] },
      series: [{ type: 'heatmap', data, label: { show: true, color: '#fff', fontSize: 11, formatter: p => p.value[2] }, itemStyle: { borderColor: css('--panel'), borderWidth: 2, borderRadius: 4 } }] }); }
  c = mk('rdc-lb');
  if (c) { let lb = NX.rdLeaderboard(S.datasets, { level: 'bdm', value: D.sc.reg.bdm }, myNames(), rdM).slice().reverse();
    const el = $('#rdc-lb'); el.style.height = Math.max(220, lb.length * 26 + 30) + 'px'; c.resize();
    c.setOption({ grid: { left: 8, right: 52, top: 6, bottom: 6, containLabel: true }, tooltip: Object.assign({ trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: v => v + '%' }, B.tip),
      xAxis: { type: 'value', splitLine: { lineStyle: { color: B.ln } }, axisLabel: { color: B.mu, formatter: '{value}%' } }, yAxis: { type: 'category', data: lb.map(o => o.mine ? S.settings.owner + ' (me)' : o.name), axisLabel: { color: B.fg, fontSize: 12 }, axisTick: { show: false } },
      series: [{ type: 'bar', barMaxWidth: 16, data: lb.map(o => ({ value: +o.pct.toFixed(2), itemStyle: { color: o.mine ? css('--good') : css('--violet'), borderRadius: [0, 5, 5, 0] } })), label: { show: true, position: 'right', color: B.mu, fontSize: 11, formatter: p => p.value.toFixed(1) + '%' } }] }); }
};
// ---------- upload safety: duplicate files, column changes, refresh log ----------
async function fileHash(buf) {
  try { if (crypto && crypto.subtle) { const h = await crypto.subtle.digest('SHA-256', buf); return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join(''); } } catch (e) { }
  const a = new Uint8Array(buf); let h = 2166136261; const step = Math.max(1, Math.floor(a.length / 200000)); for (let i = 0; i < a.length; i += step) { h ^= a[i]; h = Math.imul(h, 16777619); } return 'f' + (h >>> 0).toString(16) + '-' + a.length;
}
function dupOf(hash) { const f = (S.files || {})[hash]; if (!f) return null; return S.datasets.some(d => d.file === f.name && (d.at || 0) >= f.at - 5000) || Object.values(S.kra || {}).some(K => K.file === f.name) ? f : null; }
function colCheck(tid, headers) {
  const h = (headers || []).map(x => String(x == null ? '' : x).trim()).filter(Boolean); if (!h.length) return null;
  S.colSig = S.colSig || {}; const prev = S.colSig[tid]; S.colSig[tid] = h; if (!prev) return null;
  const add = h.filter(x => !prev.includes(x)), gone = prev.filter(x => !h.includes(x)); if (!add.length && !gone.length) return null;
  return (gone.length ? 'missing: ' + gone.slice(0, 6).join(', ') + (gone.length > 6 ? '…' : '') : '') + (gone.length && add.length ? ' · ' : '') + (add.length ? 'new: ' + add.slice(0, 6).join(', ') + (add.length > 6 ? '…' : '') : '');
}
function logRefresh(e) { S.refreshLog = S.refreshLog || []; S.refreshLog.unshift(Object.assign({ at: Date.now(), source: 'Manual upload' }, e)); S.refreshLog = S.refreshLog.slice(0, 60); }
