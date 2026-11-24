// Meta Retention Exam (Damoni, Nov 23, 2026): one additional meta exam that
// sits different — its own spot on the front page. It builds a random test
// from the number sets he has FINISHED SUCCESSFULLY (a finished attempt at
// 80% or better, the site's Mastered line) across the two number subjects
// (60 Minutes + Fraction Bases), as an assessment that he hasn't forgotten.
//
// Own history key 'meta-retention': its attempts never feed any module's
// tier/topic status, and its missed list lives on this page's results (and
// in its own attempt record). Place-holding mirrors exam.js: progress is
// saved to examProgress under the same key and resumes at the same question.
const RET_KEY = 'meta-retention';
const RET_CATS = ['60 Minutes', 'Fraction Bases'];
const RET_N = 20;

function retHistory() {
  try { return JSON.parse(localStorage.getItem('examHistory') || '{}'); } catch (e) { return {}; }
}
// A set qualifies when any finished attempt under its own keys (its Start
// key, or a mode/tier key) scored at least 80%. KEEP IN SYNC with the copy
// in exams.js (retQualifying) that counts sets for the front-page card.
function retModulePassed(file, hist) {
  for (const k of Object.keys(hist)) {
    if (k === file || k.indexOf(file + '#') === 0) {
      const arr = hist[k] || [];
      for (const a of arr) {
        if (a && a.total > 0 && a.score / a.total >= 0.8) return true;
      }
    }
  }
  return false;
}
function retQualifying(entries, hist) {
  return entries.filter(e => RET_CATS.indexOf(e.category) !== -1 && retModulePassed(e.file, hist));
}

let retPool = [];        // [{file, title, q}]
let retRun = [];         // sampled questions for this run
let retIdx = 0;
let retAnswers = [];
let retScore = 0;
// Time tracker (Nov 23, 2026): same banking as exam.js — a resumed run
// keeps its earlier segments; a finished attempt records the total 'secs'.
let retBankedSecs = 0;
let retSegStart = Date.now();
function retElapsedSecs() { return Math.round(retBankedSecs + (Date.now() - retSegStart) / 1000); }

function retSaveProgress() {
  try {
    const all = JSON.parse(localStorage.getItem('examProgress') || '{}');
    all[RET_KEY] = {
      picks: retRun.map(r => ({ f: r.file, q: r.q.question })),
      idx: retIdx, answers: retAnswers, score: retScore,
      total: retRun.length, ts: Date.now(), secs: retElapsedSecs()
    };
    localStorage.setItem('examProgress', JSON.stringify(all));
  } catch (e) { /* storage unavailable */ }
}
function retClearProgress() {
  try {
    const all = JSON.parse(localStorage.getItem('examProgress') || '{}');
    delete all[RET_KEY];
    localStorage.setItem('examProgress', JSON.stringify(all));
  } catch (e) { /* storage unavailable */ }
}
function retLoadProgress() {
  try {
    const all = JSON.parse(localStorage.getItem('examProgress') || '{}');
    return all[RET_KEY] || null;
  } catch (e) { return null; }
}

function retShuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

function retShowQuestion() {
  const r = retRun[retIdx];
  const q = r.q;
  document.getElementById('progress').textContent = 'Question ' + (retIdx + 1) + ' of ' + retRun.length;
  document.getElementById('question-text').textContent = q.question;
  document.getElementById('source-line').textContent = 'From: ' + r.title;
  const box = document.getElementById('choices');
  box.innerHTML = '';
  const answered = retAnswers[retIdx] !== undefined;
  q.choices.forEach((c, ci) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'choice';
    b.textContent = c;
    if (answered) {
      b.disabled = true;
      if (ci === q.answer) b.classList.add('correct');
      else if (ci === retAnswers[retIdx]) b.classList.add('wrong');
    }
    b.addEventListener('click', () => retAnswer(ci));
    box.appendChild(b);
  });
  const fb = document.getElementById('feedback');
  if (answered) {
    fb.textContent = (retAnswers[retIdx] === q.answer ? 'Correct. ' : 'Not quite. ') + (q.explanation || '');
  } else {
    fb.textContent = '';
  }
  document.getElementById('back-btn').hidden = retIdx === 0;
  const next = document.getElementById('next-btn');
  next.hidden = !answered;
  next.textContent = retIdx === retRun.length - 1 ? 'Finish' : 'Next';
}

function retAnswer(ci) {
  if (retAnswers[retIdx] !== undefined) return; // locked once picked, like the runner
  const q = retRun[retIdx].q;
  retAnswers[retIdx] = ci;
  if (ci === q.answer) retScore++;
  retSaveProgress();
  retShowQuestion();
}

function retFinish() {
  retClearProgress();
  document.getElementById('question-box').hidden = true;
  document.getElementById('setup-box').hidden = true;
  document.getElementById('progress').textContent = '';
  document.getElementById('result-box').hidden = false;
  document.getElementById('score').textContent = 'Score: ' + retScore + ' of ' + retRun.length;
  const missed = [];
  retRun.forEach((r, i) => {
    const q = r.q;
    if (retAnswers[i] !== q.answer) {
      missed.push({
        n: i + 1, question: q.question, source: q.source || '',
        your: retAnswers[i] === undefined ? '(no answer)' : q.choices[retAnswers[i]],
        correct: q.choices[q.answer], explanation: q.explanation || ''
      });
    }
  });
  const list = document.getElementById('missed-list');
  list.innerHTML = '';
  missed.forEach(m => {
    const li = document.createElement('li');
    li.textContent = m.question + ' — Your answer: ' + m.your + ' · Correct: ' + m.correct + (m.source ? ' · Deck: ' + m.source : '') + (m.explanation ? ' · ' + m.explanation : '');
    list.appendChild(li);
  });
  document.getElementById('no-missed').hidden = missed.length !== 0;
  try {
    const all = retHistory();
    if (!Array.isArray(all[RET_KEY])) all[RET_KEY] = [];
    all[RET_KEY].unshift({
      ts: new Date().toISOString(), title: 'Meta Retention Exam',
      score: retScore, total: retRun.length, secs: retElapsedSecs(), missed: missed, flagged: [], quality: [],
      asked: retRun.map(r => r.q.question)
    });
    all[RET_KEY] = all[RET_KEY].slice(0, 20);
    localStorage.setItem('examHistory', JSON.stringify(all));
  } catch (e) { /* storage unavailable; results still shown on screen */ }
}

function retStart(resume) {
  const p = resume ? retLoadProgress() : null;
  if (p && Array.isArray(p.picks) && p.picks.length) {
    const byKey = {};
    retPool.forEach(r => { byKey[r.file + '|' + r.q.question] = r; });
    const run = p.picks.map(pk => byKey[pk.f + '|' + pk.q]);
    if (run.every(r => r)) {
      retRun = run;
      retIdx = Math.min(p.idx || 0, retRun.length - 1);
      retAnswers = Array.isArray(p.answers) ? p.answers : [];
      retScore = p.score || 0;
      retBankedSecs = p.secs || 0;
      retSegStart = Date.now();
      document.getElementById('setup-box').hidden = true;
      document.getElementById('result-box').hidden = true;
      document.getElementById('question-box').hidden = false;
      retShowQuestion();
      return;
    }
    retClearProgress(); // saved picks no longer match the pool — start fresh
  }
  retRun = retShuffle(retPool.slice()).slice(0, Math.min(RET_N, retPool.length));
  retIdx = 0;
  retAnswers = [];
  retScore = 0;
  retBankedSecs = 0;
  retSegStart = Date.now();
  retSaveProgress();
  document.getElementById('setup-box').hidden = true;
  document.getElementById('result-box').hidden = true;
  document.getElementById('question-box').hidden = false;
  retShowQuestion();
}

fetch('index.json', { cache: 'no-store' })
  .then(r => r.json())
  .then(idx => {
    const hist = retHistory();
    const qual = retQualifying(idx.exams || [], hist);
    const status = document.getElementById('ret-status');
    const sets = document.getElementById('ret-sets');
    if (!qual.length) {
      status.textContent = 'No finished sets yet. Finish a 60 Minutes or Fraction Bases set at 80% or better and it joins this test.';
      return;
    }
    return Promise.all(qual.map(e =>
      fetch(e.file, { cache: 'no-store' }).then(r => r.json()).then(d => {
        (d.questions || []).forEach(q => retPool.push({ file: e.file, title: e.title, q: q }));
      })
    )).then(() => {
      status.textContent = qual.length + (qual.length === 1 ? ' set' : ' sets') + ' finished successfully · ' + retPool.length + ' questions in the mix · each test draws ' + Math.min(RET_N, retPool.length) + ' at random.';
      qual.forEach(e => {
        const li = document.createElement('li');
        li.textContent = e.title;
        sets.appendChild(li);
      });
      const startBtn = document.getElementById('ret-start');
      startBtn.hidden = false;
      if (retLoadProgress()) document.getElementById('ret-resume-note').hidden = false;
      startBtn.addEventListener('click', () => retStart(true));
    });
  })
  .catch(() => {
    document.getElementById('ret-status').textContent = 'Could not load the exam list.';
  });

document.getElementById('next-btn').addEventListener('click', () => {
  if (retIdx === retRun.length - 1) { retFinish(); return; }
  retIdx++;
  retSaveProgress();
  retShowQuestion();
});
document.getElementById('back-btn').addEventListener('click', () => {
  if (retIdx > 0) { retIdx--; retSaveProgress(); retShowQuestion(); }
});
document.getElementById('retry-btn').addEventListener('click', () => retStart(false));
