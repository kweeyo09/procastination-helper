// app.js — FocusNest
'use strict';

// ── Encouragements ───────────────────────────
const KUDOS = [
  "You started. That's the hard bit.",
  "One step done. Look at you go.",
  "You're doing it right now.",
  "Momentum is real — keep going.",
  "That one's crossed off. Next feels easier.",
  "Proud of you for that.",
  "Keep going, you've got this.",
  "Step by step. You've got it.",
  "This is exactly how it's done.",
  "Nothing left but to continue ✦",
  "Yes. Exactly that.",
  "You showed up. That's everything.",
];

const LOADING_PHRASES = [
  "Breaking it all the way down...",
  "Making it tiny...",
  "Thinking up micro-steps...",
  "Keeping it small...",
  "Almost ready...",
];

// ── State ────────────────────────────────────
let steps = [];

// ── DOM refs ─────────────────────────────────
const dom = {
  taskInput:     document.getElementById('task-input'),
  breakdownBtn:  document.getElementById('breakdown-btn'),
  progressRow:   document.getElementById('progress-row'),
  progressFill:  document.getElementById('progress-fill'),
  progressCount: document.getElementById('progress-count'),
  loading:       document.getElementById('loading'),
  loadingText:   document.getElementById('loading-text'),
  steps:         document.getElementById('steps'),
  doneState:     document.getElementById('done-state'),
  resetBtn:      document.getElementById('reset-btn'),
  toast:         document.getElementById('toast'),
  lamp:          document.getElementById('lamp-glow'),
};

// ── Breakdown trigger ─────────────────────────
dom.breakdownBtn.addEventListener('click', runBreakdown);
dom.taskInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    runBreakdown();
  }
});

async function runBreakdown() {
  const task = dom.taskInput.value.trim();
  if (!task) { dom.taskInput.focus(); return; }

  setLoading(true);
  // Brief pause so the loading state feels intentional
  await new Promise(r => setTimeout(r, 500 + Math.random() * 400));

  const stepTexts = breakdownLocally(task);
  renderSteps(stepTexts);
  setLoading(false);
}

// ── Rule-based breakdown engine ───────────────

function brief(task, max = 42) {
  const cleaned = task
    .replace(/^(write|draft|finish|complete|do|create|make|fix|build|start|study|read|clean|organiz|plan|send|fill)\s+(a\s+|an\s+|my\s+|the\s+|this\s+|out\s+)?/i, '')
    .trim();
  return cleaned.length > max ? cleaned.slice(0, max) + '…' : cleaned;
}

const CATEGORIES = [
  {
    name: 'email',
    test: t => /\bemail\b|reply to|respond to|write.*message|send.*message|send.*email/.test(t),
    steps: () => [
      `Open your email client right now`,
      `Find or create the message you need to reply to`,
      `Type just the subject line — one clear phrase`,
      `Write one sentence: the single most important thing to say`,
      `Add a greeting and a sign-off around that sentence`,
      `Read it once end-to-end, then hit Send`,
    ],
  },
  {
    name: 'writing',
    test: t => /\b(write|draft|essay|blog|article|paragraph|letter|introduction|conclusion|report|caption|summarize|summarise|compose)\b/.test(t),
    steps: task => {
      const s = brief(task);
      return [
        `Open a blank document — don't format anything yet`,
        `Type this at the top: "${s}"`,
        `Write one sentence: the single main idea you need to get across`,
        `Jot down 3 bullet points — the only things you need to cover`,
        `Expand the first bullet into 2–3 full sentences`,
        `Save what you have — you've started, and that's everything`,
      ];
    },
  },
  {
    name: 'coding',
    test: t => /\b(code|debug|fix.*bug|\bbug\b|implement|build.*feature|write.*function|\bcomponent\b|refactor|deploy|\bscript\b|program|feature)\b/.test(t),
    steps: task => {
      const s = brief(task, 52);
      return [
        `Open your editor and find the relevant file`,
        `Write a comment at the top: // ${s}`,
        `Write just the function or component signature — no body yet`,
        `Fill in the simplest possible version of the logic`,
        `Run it and read any errors carefully, one at a time`,
        `Fix one error, test again, then commit what works`,
      ];
    },
  },
  {
    name: 'studying',
    test: t => /\b(study|revise|review|memorize|memorise|practice|practise|\bprep\b|exam|quiz|lesson|chapter|course)\b/.test(t),
    steps: () => [
      `Open your notes or the material right now`,
      `Write the topic at the top of a blank page`,
      `Set a 5-minute timer and read or skim the first section`,
      `Write 3 things you just learned, in your own words`,
      `Write 1 question you still don't understand`,
      `Find the answer to that one question in your materials`,
    ],
  },
  {
    name: 'cleaning',
    test: t => /\b(clean|tidy|organiz|organis|sort|declutter|vacuum|mop|laundry|dishes|hoover|sweep)\b/.test(t),
    steps: () => [
      `Set a 10-minute timer on your phone right now`,
      `Pick up everything from the floor and pile it somewhere`,
      `Throw away any obvious trash: wrappers, bottles, tissues`,
      `Put away exactly 5 items from the pile — just 5`,
      `Wipe down one surface only: desk, table, or counter`,
      `Take a photo of the improvement — the progress is real`,
    ],
  },
  {
    name: 'reading',
    test: t => /\b(read|finish reading|skim|chapter|book|paper|article)\b/.test(t),
    steps: () => [
      `Get the book open or find the article or tab right now`,
      `Skim just the headings or first sentences for 60 seconds`,
      `Read only the first paragraph — one paragraph, that's all`,
      `Keep reading until you reach a natural pause or section break`,
      `Write one sentence summing up what you just read`,
      `Mark your place so you know exactly where to pick up next`,
    ],
  },
  {
    name: 'exercise',
    test: t => /\b(workout|exercise|gym|run|jog|yoga|stretch|training|lifting|cardio|pushups|sit.ups)\b/.test(t),
    steps: () => [
      `Change into your workout clothes right now`,
      `Fill a water bottle and put it where you'll use it`,
      `Do a 2-minute warm-up: arm swings, leg circles, light walk`,
      `Start the first movement for just 30 seconds at easy intensity`,
      `Complete 2 full sets of your main exercise`,
      `Cool down: 2 minutes of slow movement and one good stretch`,
    ],
  },
  {
    name: 'meeting',
    test: t => /\b(meeting|presentation|present|pitch|interview|standup|prepare.*call|prep.*meeting)\b/.test(t),
    steps: () => [
      `Open a blank document and write the meeting name at the top`,
      `List the 3 most important things to say or ask`,
      `Write one sentence: your single main point`,
      `Note any numbers, names, or facts you'll need to reference`,
      `Check your setup: camera, mic, slides, link, or dial-in`,
      `Set an alarm for 5 minutes before it starts`,
    ],
  },
  {
    name: 'form',
    test: t => /\b(fill|form|application|apply|submit|upload|registration|register|sign up)\b/.test(t),
    steps: () => [
      `Open the form, document, or application page right now`,
      `Read through it once without filling anything in`,
      `Gather what you'll need: ID, dates, reference numbers`,
      `Fill in your personal details first — name, email, address`,
      `Complete the remaining required fields one by one`,
      `Review it once end-to-end, then click Submit`,
    ],
  },
  {
    name: 'planning',
    test: t => /\b(plan|schedule|budget|outline|map out|organiz|organis|\blist\b)\b/.test(t),
    steps: task => {
      const s = brief(task);
      return [
        `Open a blank document or notes app`,
        `Write "${s}" at the very top`,
        `Brain-dump everything related without editing — just list it all`,
        `Circle or mark the 3 most important items`,
        `Put those 3 in order: what needs to happen first?`,
        `Write the very first action you can take today`,
      ];
    },
  },
];

function defaultSteps(task) {
  const s = brief(task);
  return [
    `Open whatever you need to start "${s}"`,
    `Write the task name somewhere visible — doc, sticky, or phone`,
    `Identify the one thing that's blocking you from beginning`,
    `Do the smallest possible first action — just get it open`,
    `Work on it for 5 minutes without stopping to evaluate`,
    `Before you close anything, write down what the next step is`,
  ];
}

function breakdownLocally(task) {
  const t = task.toLowerCase().trim();
  for (const cat of CATEGORIES) {
    if (cat.test(t)) return cat.steps(task);
  }
  return defaultSteps(task);
}

// ── Render steps ──────────────────────────────
function renderSteps(texts) {
  steps = texts.map(t => ({ text: t, done: false }));

  dom.steps.innerHTML = '';
  dom.doneState.classList.add('hidden');
  dom.lamp.classList.remove('bright');
  dom.progressRow.classList.remove('hidden');

  steps.forEach((step, i) => {
    const li = buildStepEl(step, i);
    li.style.animationDelay = `${i * 65}ms`;
    dom.steps.appendChild(li);
  });

  updateProgress();
  highlightActive();
}

function buildStepEl(step, i) {
  const li = document.createElement('li');
  li.className = 'step';
  li.dataset.i = i;

  // Typewriter step number
  const num = document.createElement('span');
  num.className = 'step-num';
  num.textContent = String(i + 1).padStart(2, '0');

  // Custom checkbox
  const box = document.createElement('div');
  box.className = 'check-box';
  box.setAttribute('role', 'checkbox');
  box.setAttribute('aria-checked', 'false');
  box.setAttribute('tabindex', '0');
  box.innerHTML = `<svg width="10" height="8" viewBox="0 0 10 8" fill="none">
    <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" stroke-width="1.8"
      stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;

  const toggle = () => toggleStep(i);
  box.addEventListener('click', toggle);
  box.addEventListener('keydown', e => {
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(); }
  });

  // Editable label
  const label = document.createElement('div');
  label.className       = 'step-label';
  label.contentEditable = 'true';
  label.spellcheck      = true;
  label.textContent     = step.text;
  label.addEventListener('input', () => { steps[i].text = label.textContent.trim(); });
  label.addEventListener('keydown', e => {
    if (e.key === 'Enter') e.preventDefault();
  });

  li.append(num, box, label);
  return li;
}

// ── Toggle a step ─────────────────────────────
function toggleStep(i) {
  steps[i].done = !steps[i].done;

  const li  = dom.steps.querySelector(`[data-i="${i}"]`);
  const box = li.querySelector('.check-box');

  if (steps[i].done) {
    li.classList.add('done');
    li.classList.remove('active');
    box.classList.add('bounce');
    box.setAttribute('aria-checked', 'true');
    box.addEventListener('animationend', () => box.classList.remove('bounce'), { once: true });

    if (Math.random() > 0.35) {
      showToast(KUDOS[Math.floor(Math.random() * KUDOS.length)]);
    }
  } else {
    li.classList.remove('done');
    box.setAttribute('aria-checked', 'false');
  }

  updateProgress();
  highlightActive();

  if (steps.every(s => s.done)) {
    setTimeout(showDone, 450);
  }
}

function highlightActive() {
  dom.steps.querySelectorAll('.step').forEach(el => el.classList.remove('active'));
  const idx = steps.findIndex(s => !s.done);
  if (idx >= 0) {
    dom.steps.querySelector(`[data-i="${idx}"]`)?.classList.add('active');
  }
}

function updateProgress() {
  const done  = steps.filter(s => s.done).length;
  const total = steps.length;
  const pct   = total ? (done / total) * 100 : 0;
  dom.progressFill.style.width  = `${pct}%`;
  dom.progressCount.textContent = `${done} / ${total}`;
}

// ── All done ──────────────────────────────────
function showDone() {
  dom.doneState.classList.remove('hidden');
  dom.lamp.classList.add('bright');
}

dom.resetBtn.addEventListener('click', () => {
  steps = [];
  dom.steps.innerHTML   = '';
  dom.taskInput.value   = '';
  dom.progressRow.classList.add('hidden');
  dom.doneState.classList.add('hidden');
  dom.lamp.classList.remove('bright');
  dom.taskInput.focus();
});

// ── Loading UI ────────────────────────────────
function setLoading(on) {
  dom.loading.classList.toggle('hidden', !on);
  dom.breakdownBtn.disabled    = on;
  dom.breakdownBtn.textContent = on ? 'Working...' : 'Break it down ✦';
  if (on) {
    dom.steps.innerHTML = '';
    dom.progressRow.classList.add('hidden');
    dom.doneState.classList.add('hidden');
    dom.loadingText.textContent = LOADING_PHRASES[Math.floor(Math.random() * LOADING_PHRASES.length)];
  }
}

// ── Toast ─────────────────────────────────────
let toastTimer = null;
function showToast(msg) {
  dom.toast.textContent = msg;
  dom.toast.classList.remove('hidden');
  void dom.toast.offsetWidth;
  dom.toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    dom.toast.classList.remove('visible');
    setTimeout(() => dom.toast.classList.add('hidden'), 300);
  }, 3000);
}
