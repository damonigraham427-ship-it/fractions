// Fraction Bases circle (split from the Hour series at Damoni’s order, Nov 22, 2026) — slice = exam, sub-units = 20 tiers of 5%.
// Same interaction and status language as topics.js (NREMT circle).
// Tier logic lives in hour-tiers.js (HourTiers.hourStatus).
(function () {
  var PALETTE = ['#2563eb', '#0891b2', '#059669', '#65a30d', '#d97706', '#dc2626', '#7c3aed', '#db2777', '#0d9488', '#475569'];
  var STATUS = { 'Mastered': '#15803d', 'Learning': '#f59e0b', 'Ready to Learn': '#2563eb' };
  var hist = {};
  try { hist = JSON.parse(localStorage.getItem('examHistory') || '{}'); } catch (e) { hist = {}; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function tint(hex, f) { var n = parseInt(hex.slice(1), 16); var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255; r = Math.round(r + (255 - r) * f); g = Math.round(g + (255 - g) * f); b = Math.round(b + (255 - b) * f); return 'rgb(' + r + ',' + g + ',' + b + ')'; }
  function wedge(cx, cy, r, a0, a1) { if (a1 - a0 >= Math.PI * 2) a1 = a0 + Math.PI * 2 - 0.0001; var x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0); var x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1); var large = (a1 - a0) > Math.PI ? 1 : 0; return 'M' + cx + ' ' + cy + ' L' + x0.toFixed(1) + ' ' + y0.toFixed(1) + ' A' + r + ' ' + r + ' 0 ' + large + ' 1 ' + x1.toFixed(1) + ' ' + y1.toFixed(1) + ' Z'; }
  function shortTitle(e) { var t = e.title || e.file; var pre = (e.category || '') + ' \u2014 '; if (t.indexOf(pre) === 0) t = t.slice(pre.length); return t; }

  fetch('index.json', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (idx) {
    var entries = (idx.exams || []).filter(function (e) { return e.category === 'Fraction Bases' && e.pie !== 2; });
    return Promise.all(entries.map(function (e) {
      return fetch(e.file, { cache: 'no-store' }).then(function (r) { return r.json(); })
        .then(function (d) { return { entry: e, questions: d.questions || [] }; })
        .catch(function () { return { entry: e, questions: [] }; });
    }));
  }).then(function (groups) {
    groups.forEach(function (g, gi) {
      g.color = PALETTE[gi % PALETTE.length];
      g.name = shortTitle(g.entry);
      g.st = HourTiers.hourStatus(hist, g.entry.file, g.questions);
      g.pct = g.st.pct;
      g.counts = { 'Mastered': 0, 'Learning': 0, 'Ready to Learn': 0 };
      g.st.tiers.forEach(function (t) { g.counts[t.status]++; });
    });
    var totalTiers = groups.length * 20;
    // UP NEXT: first Learning tier, else first Ready tier (topics.js pattern).
    var up = null;
    ['Learning', 'Ready to Learn'].forEach(function (want) {
      if (up) return;
      groups.forEach(function (g) { if (up) return; g.st.tiers.forEach(function (t) { if (!up && t.status === want) up = { g: g, t: t }; }); });
    });
    var upEl = document.getElementById('tp-upnext');
    if (up && upEl) {
      upEl.hidden = false;
      upEl.innerHTML = 'UP NEXT: <strong>Tier ' + esc(up.t.label) + '</strong> \u00B7 ' + esc(up.g.name) +
        ' <a class="tp-practice" href="exam.html?exam=' + encodeURIComponent(up.g.entry.file) + '&tier=' + up.t.b + '">Practice</a>';
    }
    var mastered = groups.reduce(function (s, g) { return s + g.counts['Mastered']; }, 0);
    var svg = document.getElementById('tp-pie');
    var CX = 210, CY = 210, R = 198, a = -Math.PI / 2, parts = [];
    groups.forEach(function (g, gi) {
      var span = totalTiers ? (Math.PI * 2) * (20 / totalTiers) : 0;
      var order = [['Mastered', g.color], ['Learning', tint(g.color, 0.45)], ['Ready to Learn', tint(g.color, 0.82)]];
      var cur = a;
      order.forEach(function (o) {
        if (!g.counts[o[0]]) return;
        var sub = span * (g.counts[o[0]] / 20);
        parts.push('<path d="' + wedge(CX, CY, R, cur, cur + sub) + '" fill="' + o[1] + '" stroke="#fff" stroke-width="2" data-group="' + gi + '"><title>' + esc(g.name) + '</title></path>');
        cur += sub;
      });
      a += span;
    });
    parts.push('<circle cx="' + CX + '" cy="' + CY + '" r="80" fill="#fff" stroke="#cbd5e1" stroke-width="2" id="tp-center-bg"></circle>');
    parts.push('<text id="tp-center-num" x="' + CX + '" y="' + (CY - 2) + '" text-anchor="middle" font-size="40" font-weight="700" fill="#0f172a"></text>');
    parts.push('<text id="tp-center-lab" x="' + CX + '" y="' + (CY + 24) + '" text-anchor="middle" font-size="14" fill="#475569"></text>');
    svg.innerHTML = parts.join('');
    var preview = -1, locked = -1, mi = 0;
    function active() { return preview >= 0 ? preview : locked; }
    function modeLine(g) {
      var m = g.st.modes, bits = [];
      [['Meta 10%', m.meta10], ['Meta', m.meta], ['Redundancy', m.redundancy], ['Coverage', m.coverage], ['Start', m.start]].forEach(function (p) {
        bits.push(p[0] + ': ' + (p[1] ? p[1].score + '/' + p[1].total : 'not attempted'));
      });
      return bits.join(' \u00B7 ');
    }
    function drawCenter() {
      var num = document.getElementById('tp-center-num'), lab = document.getElementById('tp-center-lab'), gi = active();
      if (gi >= 0) { var g = groups[gi]; num.textContent = g.pct + '%'; num.setAttribute('fill', g.color); lab.textContent = g.name; return; }
      num.setAttribute('fill', '#0f172a');
      var modes = [
        [mastered, 'tiers mastered of ' + totalTiers],
        [(totalTiers ? Math.round(100 * mastered / totalTiers) : 0) + '%', 'of tiers mastered']
      ];
      num.textContent = modes[mi][0];
      lab.textContent = modes[mi][1];
    }
    function renderDetail() {
      var box = document.getElementById('tp-detail'), gi = active();
      if (gi < 0) {
        var mc = 0, lc = 0, rc = 0;
        groups.forEach(function (g) { mc += g.counts['Mastered']; lc += g.counts['Learning']; rc += g.counts['Ready to Learn']; });
        box.innerHTML = '<p class="tp-detail-head">Whole series</p>' +
          '<p class="tp-detail-counts"><span style="color:#15803d">Mastered ' + mc + '</span> \u00B7 <span style="color:#f59e0b">Learning ' + lc + '</span> \u00B7 <span style="color:#2563eb">Ready ' + rc + '</span></p>' +
          '<p class="tp-detail-hint">Move around the circle \u2014 only the exam you touch shows its tiers.</p>';
        return;
      }
      var g = groups[gi], c = g.counts, f = encodeURIComponent(g.entry.file);
      var html = '<p class="tp-detail-head"><span class="tp-chip-color" style="background:' + g.color + '"></span> ' + esc(g.name) +
        (locked >= 0 ? ' <button type="button" class="tp-reset" id="tp-reset">Whole series</button>' : '') + '</p>' +
        '<p class="tp-detail-counts"><span style="color:' + g.color + ';font-weight:700">' + g.pct + '% done</span> \u00B7 <span style="color:#15803d">Mastered ' + c['Mastered'] + '</span> \u00B7 <span style="color:#f59e0b">Learning ' + c['Learning'] + '</span> \u00B7 <span style="color:#2563eb">Ready ' + c['Ready to Learn'] + '</span></p>' +
        '<p class="tp-detail-counts">' + esc(modeLine(g)) + '</p>' +
        '<p class="tp-detail-counts"><a class="tp-practice" href="notepad.html?exam=' + f + '">This exam\'s Notepad</a> \u00B7 <a class="tp-practice" href="quality.html?exam=' + f + '">This exam\'s Quality review</a></p>' +
        '<p class="tp-detail-counts">' +
        '<a class="tp-practice" href="exam.html?exam=' + f + '&mode=meta10">Meta 10%</a> \u00B7 ' +
        '<a class="tp-practice" href="exam.html?exam=' + f + '&mode=meta">Meta</a> \u00B7 ' +
        '<a class="tp-practice" href="exam.html?exam=' + f + '&mode=redundancy">Redundancy</a> \u00B7 ' +
        '<a class="tp-practice" href="exam.html?exam=' + f + '&mode=coverage">Coverage</a> \u00B7 ' +
        '<a class="tp-practice" href="exam.html?exam=' + f + '">Start</a></p>';
      ['Mastered', 'Learning', 'Ready to Learn'].forEach(function (st) {
        var ts = g.st.tiers.filter(function (x) { return x.status === st; });
        if (!ts.length) return;
        html += '<p class="tp-detail-group" style="color:' + STATUS[st] + '">' + st + '</p>';
        ts.forEach(function (x) {
          html += '<div class="tp-topic-row"><span class="tp-topic-name">Tier ' + esc(x.label) + '</span><span class="tp-topic-meta">' +
            (x.n ? x.correct + '/' + x.n + ' seen \u00B7 ' + esc(x.source) : g.st.rangeN[x.b] + ' questions \u00B7 not attempted') + '</span>' +
            '<a class="tp-practice" href="exam.html?exam=' + f + '&tier=' + x.b + '">Practice</a></div>';
        });
      });
      box.innerHTML = html;
      var rb = document.getElementById('tp-reset');
      if (rb) rb.addEventListener('click', function () { locked = -1; preview = -1; draw(); });
    }
    function draw() {
      var gi = active();
      svg.querySelectorAll('path[data-group]').forEach(function (p) { p.style.opacity = (gi < 0 || +p.getAttribute('data-group') === gi) ? '1' : '0.3'; });
      drawCenter(); renderDetail();
    }
    function sliceFromEvent(ev) { var t = ev.target; if (t && t.getAttribute && t.getAttribute('data-group') !== null) return +t.getAttribute('data-group'); return -2; }
    svg.addEventListener('pointermove', function (ev) { var gi = sliceFromEvent(ev); if (gi >= 0 && gi !== preview) { preview = gi; draw(); } });
    svg.addEventListener('pointerleave', function () { if (preview >= 0) { preview = -1; draw(); } });
    svg.addEventListener('click', function (ev) {
      if (ev.target.id === 'tp-center-bg' || ev.target.id === 'tp-center-num' || ev.target.id === 'tp-center-lab') { if (active() >= 0) { locked = -1; preview = -1; draw(); } else { mi = (mi + 1) % 2; drawCenter(); } return; }
      var gi = sliceFromEvent(ev);
      if (gi >= 0) { locked = (locked === gi) ? -1 : gi; preview = -1; draw(); }
    });
    draw();
  }).catch(function () { document.getElementById('tp-note').textContent = 'Could not load the exam list.'; });
})();
