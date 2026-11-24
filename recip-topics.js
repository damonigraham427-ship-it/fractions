// Reciprocals — 1/x (Damoni, Nov 23, 2026): the SECOND pie on the Fraction
// Bases page, in its own subsection under the first pie. Same numbers as
// the first pie (the 89 denominators), tested as 1/x, grouped into exams
// of 20 numbers (index entries with pie: 2). Same interaction as the other
// circles: scrub to preview, tap to lock, tap the center to release.
// Status per exam comes from its latest Start attempt in examHistory:
// Mastered = 80%+, Learning = attempted under 80%, Ready = not attempted.
// Slice fill follows the site language: full color / 0.45 tint / 0.82 tint.
(function () {
  var PALETTE = ['#7c3aed', '#db2777', '#0d9488', '#475569', '#b45309'];
  var hist = {};
  try { hist = JSON.parse(localStorage.getItem('examHistory') || '{}'); } catch (e) { hist = {}; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function tint(hex, f) { var n = parseInt(hex.slice(1), 16); var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255; r = Math.round(r + (255 - r) * f); g = Math.round(g + (255 - g) * f); b = Math.round(b + (255 - b) * f); return 'rgb(' + r + ',' + g + ',' + b + ')'; }
  function wedge(cx, cy, r, a0, a1) { if (a1 - a0 >= Math.PI * 2) a1 = a0 + Math.PI * 2 - 0.0001; var x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0); var x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1); var large = (a1 - a0) > Math.PI ? 1 : 0; return 'M' + cx + ' ' + cy + ' L' + x0.toFixed(1) + ' ' + y0.toFixed(1) + ' A' + r + ' ' + r + ' 0 ' + large + ' 1 ' + x1.toFixed(1) + ' ' + y1.toFixed(1) + ' Z'; }
  function shortTitle(e) { var t = e.title || e.file; var pre = (e.category || '') + ' \u2014 '; if (t.indexOf(pre) === 0) t = t.slice(pre.length); return t; }

  fetch('index.json', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (idx) {
    var entries = (idx.exams || []).filter(function (e) { return e.category === 'Fraction Bases' && e.pie === 2; });
    return Promise.all(entries.map(function (e) {
      return fetch(e.file, { cache: 'no-store' }).then(function (r) { return r.json(); })
        .then(function (d) { return { entry: e, questions: d.questions || [] }; })
        .catch(function () { return { entry: e, questions: [] }; });
    }));
  }).then(function (groups) {
    groups.forEach(function (g, gi) {
      g.color = PALETTE[gi % PALETTE.length];
      g.name = shortTitle(g.entry);
      var atts = (hist[g.entry.file] || []).filter(function (a) { return a && a.total > 0; });
      var last = atts.length ? atts[0] : null; // attempts are newest-first (exam.js unshifts)
      g.pct = last ? Math.round(100 * last.score / last.total) : 0;
      g.status = !last ? 'Ready to Learn' : (g.pct >= 80 ? 'Mastered' : 'Learning');
      g.last = last;
    });
    // UP NEXT: first Learning exam, else first Ready exam.
    var up = null;
    ['Learning', 'Ready to Learn'].forEach(function (want) {
      if (up) return;
      groups.forEach(function (g) { if (!up && g.status === want) up = g; });
    });
    var upEl = document.getElementById('rp-upnext');
    if (up && upEl) {
      upEl.hidden = false;
      upEl.innerHTML = 'UP NEXT: <strong>' + esc(up.name) + '</strong> ' +
        '<a class="tp-practice" href="exam.html?exam=' + encodeURIComponent(up.entry.file) + '">Start</a>';
    }
    var mastered = groups.filter(function (g) { return g.status === 'Mastered'; }).length;
    var svg = document.getElementById('rp-pie');
    var CX = 210, CY = 210, R = 198, a = -Math.PI / 2, parts = [];
    groups.forEach(function (g, gi) {
      var span = groups.length ? (Math.PI * 2) / groups.length : 0;
      var fill = g.status === 'Mastered' ? g.color : (g.status === 'Learning' ? tint(g.color, 0.45) : tint(g.color, 0.82));
      parts.push('<path d="' + wedge(CX, CY, R, a, a + span) + '" fill="' + fill + '" stroke="#fff" stroke-width="2" data-group="' + gi + '"><title>' + esc(g.name) + '</title></path>');
      a += span;
    });
    parts.push('<circle cx="' + CX + '" cy="' + CY + '" r="80" fill="#fff" stroke="#cbd5e1" stroke-width="2" id="rp-center-bg"></circle>');
    parts.push('<text id="rp-center-num" x="' + CX + '" y="' + (CY - 2) + '" text-anchor="middle" font-size="40" font-weight="700" fill="#0f172a"></text>');
    parts.push('<text id="rp-center-lab" x="' + CX + '" y="' + (CY + 24) + '" text-anchor="middle" font-size="14" fill="#475569"></text>');
    svg.innerHTML = parts.join('');
    var preview = -1, locked = -1, mi = 0;
    function active() { return preview >= 0 ? preview : locked; }
    function drawCenter() {
      var num = document.getElementById('rp-center-num'), lab = document.getElementById('rp-center-lab'), gi = active();
      if (gi >= 0) { var g = groups[gi]; num.textContent = g.pct + '%'; num.setAttribute('fill', g.color); lab.textContent = g.name; return; }
      num.setAttribute('fill', '#0f172a');
      var modes = [
        [mastered, 'exams mastered of ' + groups.length],
        [(groups.length ? Math.round(100 * mastered / groups.length) : 0) + '%', 'of exams mastered']
      ];
      num.textContent = modes[mi][0];
      lab.textContent = modes[mi][1];
    }
    function renderDetail() {
      var box = document.getElementById('rp-detail'), gi = active();
      if (gi < 0) {
        var mc = 0, lc = 0, rc = 0;
        groups.forEach(function (g) { if (g.status === 'Mastered') mc++; else if (g.status === 'Learning') lc++; else rc++; });
        box.innerHTML = '<p class="tp-detail-head">Whole pie</p>' +
          '<p class="tp-detail-counts"><span style="color:#15803d">Mastered ' + mc + '</span> \u00B7 <span style="color:#f59e0b">Learning ' + lc + '</span> \u00B7 <span style="color:#2563eb">Ready ' + rc + '</span></p>' +
          '<p class="tp-detail-hint">Move around the circle \u2014 only the exam you touch shows its details.</p>';
        return;
      }
      var g = groups[gi], f = encodeURIComponent(g.entry.file);
      var stColor = g.status === 'Mastered' ? '#15803d' : (g.status === 'Learning' ? '#f59e0b' : '#2563eb');
      box.innerHTML = '<p class="tp-detail-head"><span class="tp-chip-color" style="background:' + g.color + '"></span> ' + esc(g.name) +
        (locked >= 0 ? ' <button type="button" class="tp-reset" id="rp-reset">Whole pie</button>' : '') + '</p>' +
        '<p class="tp-detail-counts"><span style="color:' + stColor + ';font-weight:700">' + esc(g.status) + '</span>' +
        (g.last ? ' \u00B7 latest ' + g.last.score + '/' + g.last.total + ' (' + g.pct + '%)' : '') + '</p>' +
        '<p class="tp-detail-counts">' + g.questions.length + ' questions \u00B7 each run draws 20</p>' +
        '<p class="tp-detail-counts"><a class="tp-practice" href="exam.html?exam=' + f + '">Start</a> \u00B7 ' +
        '<a class="tp-practice" href="notepad.html?exam=' + f + '">This exam\'s Notepad</a> \u00B7 ' +
        '<a class="tp-practice" href="quality.html?exam=' + f + '">This exam\'s Quality review</a></p>';
      var rb = document.getElementById('rp-reset');
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
      if (ev.target.id === 'rp-center-bg' || ev.target.id === 'rp-center-num' || ev.target.id === 'rp-center-lab') { if (active() >= 0) { locked = -1; preview = -1; draw(); } else { mi = (mi + 1) % 2; drawCenter(); } return; }
      var gi = sliceFromEvent(ev);
      if (gi >= 0) { locked = (locked === gi) ? -1 : gi; preview = -1; draw(); }
    });
    draw();
  }).catch(function () { var n = document.getElementById('rp-note'); if (n) n.textContent = 'Could not load the reciprocal exams.'; });
})();
