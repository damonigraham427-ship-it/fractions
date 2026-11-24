// Hour series — tier logic (shared, pure; no DOM).
// Mapping proposal (for Damoni/coordinator to approve):
//   NREMT "topic"  -> Hour "tier": 20 tiers of 5% over the exam's sorted pool,
//                     exactly the bands exam.js buildMetaQuestions() uses.
//   NREMT "set"    -> Hour "exam": one of the 10 hour-*.json files.
//   Circle slice   -> one exam; slice % = mastered tiers / 20 (Mastered = 80%+).
// Evidence rule mirrors topics.js: per tier, the NEWEST attempt that covers
// that tier decides. Eligible attempts = real pool questions only:
//   plain file key (Start draw), file#coverage, file#redundancy.
// Excluded: file#meta / file#meta10 — their questions are synthetic
// (generated in exam.js, not in the pool), so their missed texts cannot be
// matched back to pool questions. They are reported separately per exam.
(function (root) {
  var ELIGIBLE_SUFFIX = ['', '#coverage', '#redundancy'];
  function tierOf(i, n) { return Math.floor(i * 20 / n); } // 0..19 for i in 0..n-1
  function tierLabel(b) { return (b * 5 + 1) + '\u2013' + ((b + 1) * 5) + '%'; }
  function tierRange(b, n) { return [Math.floor(b * n / 20), Math.floor((b + 1) * n / 20)]; }

  // hist: examHistory object. file: exam file. questions: pool array.
  // Returns {tiers:[{b,label,n,correct,status,ts,source}], mastered, pct,
  //          modes:{meta10,meta,redundancy,coverage,start}} — modes hold the
  //          latest attempt summary {score,total,ts} per storage key or null.
  function hourStatus(hist, file, questions) {
    var n = questions.length;
    var byText = {};
    questions.forEach(function (q, i) { byText[q.question] = i; });
    var tiers = [];
    for (var b = 0; b < 20; b++) tiers.push({ b: b, label: tierLabel(b), n: 0, correct: 0, status: 'Ready to Learn', ts: 0, source: '' });
    var rangeN = tiers.map(function (t) { var r = tierRange(t.b, n); return r[1] - r[0]; });
    function consider(attempt, source) {
      if (!attempt) return;
      var missed = {};
      (attempt.missed || []).forEach(function (m) { missed[m.question] = true; });
      var seen = {}; // tier -> {n, correct} for questions in THIS attempt
      // An attempt only proves the questions it actually asked. examHistory
      // historically stored only missed/flagged/quality — for a 20-question
      // DRAW that hides the correct answers, so old attempts give partial
      // evidence (missed/marked only) and are flagged source+' (partial)'.
      // The staged exam.js patch stores attempt.asked (all question texts);
      // when present, evidence is exact, like topics.js full-set runs.
      var asked = {};
      var exact = Array.isArray(attempt.asked) && attempt.asked.length === attempt.total;
      if (exact) attempt.asked.forEach(function (text) { asked[text] = true; });
      else {
        (attempt.missed || []).forEach(function (m) { asked[m.question] = true; });
        (attempt.flagged || []).forEach(function (m) { asked[m.question] = true; });
        (attempt.quality || []).forEach(function (m) { asked[m.question] = true; });
      }
      if (!exact) source = source + ' (partial)';
      Object.keys(asked).forEach(function (text) {
        var i = byText[text];
        if (i === undefined) return;
        var t = tierOf(i, n);
        (seen[t] || (seen[t] = { n: 0, correct: 0 })).n++;
        if (!missed[text]) seen[t].correct++;
      });
      var ts = Date.parse(attempt.ts || '') || 0;
      Object.keys(seen).forEach(function (tb) {
        var t = tiers[+tb];
        if (ts >= t.ts) { t.n = seen[tb].n; t.correct = seen[tb].correct; t.ts = ts; t.source = source; }
      });
    }
    ELIGIBLE_SUFFIX.forEach(function (sfx) {
      var a = (hist[file + sfx] || [])[0] || null;
      consider(a, sfx === '' ? 'Start' : sfx.slice(1));
    });
    // Tier runs (&tier=<b>, key file#tier:<b>): each asks every question in
    // its own tier, so it is exact evidence for that tier. Newest wins via
    // the same ts rule inside consider().
    for (var tb = 0; tb < 20; tb++) {
      var ta = (hist[file + '#tier:' + tb] || [])[0] || null;
      if (ta) consider(ta, 'Tier run');
    }
    tiers.forEach(function (t) {
      if (!t.n) { t.status = 'Ready to Learn'; return; }
      t.status = (t.correct / t.n) >= 0.8 ? 'Mastered' : 'Learning';
    });
    var mastered = tiers.filter(function (t) { return t.status === 'Mastered'; }).length;
    function latest(key) {
      var a = (hist[key] || [])[0];
      return a ? { score: a.score || 0, total: a.total || 0, ts: a.ts || '' } : null;
    }
    return {
      tiers: tiers, rangeN: rangeN, mastered: mastered,
      pct: Math.round(100 * mastered / 20),
      modes: {
        start: latest(file), coverage: latest(file + '#coverage'),
        redundancy: latest(file + '#redundancy'),
        meta: latest(file + '#meta'), meta10: latest(file + '#meta10')
      }
    };
  }
  var api = { tierOf: tierOf, tierLabel: tierLabel, tierRange: tierRange, hourStatus: hourStatus, ELIGIBLE_SUFFIX: ELIGIBLE_SUFFIX };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.HourTiers = api;
})(typeof window !== 'undefined' ? window : globalThis);
