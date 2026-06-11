// app.js — FocusNest
'use strict';

// ── Encouragements (Caveat font toasts) ──────
const KUDOS = [
  "You started. That's the hard bit 🕯️",
  "One step done. Look at you go.",
  "You're doing it right now.",
  "Momentum is real — keep going.",
  "That one's crossed off. Next feels easier.",
  "Proud of you for that.",
  "Keep going, cozy one 🌙",
  "Step by step. You've got it.",
  "This is exactly how it's done.",
  "Nothing left but to continue ✦",
  "Yes. Exactly that. ✦",
  "You showed up. That's everything.",
];

const LOADING_PHRASES = [
  "Making it manageable...",
  "Breaking it all the way down...",
  "Thinking up tiny steps...",
  "Keeping it small...",
  "Almost ready...",
];

// ── State ────────────────────────────────────
let apiKey = localStorage.getItem('focusnest_key') || '';
let steps  = []; // { text: string, done: boolean }[]

// ── DOM refs ──────────────────────────────────
const dom = {
  modal:         document.getElementById('api-modal'),
  apiInput:      document.getElementById('api-key-input'),
  saveKeyBtn:    document.getElementById('save-key-btn'),
  settingsBtn:   document.getElementById('settings-btn'),
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

// ── On load: prompt for key if missing ───────
if (!apiKey) openModal();

// ── API key modal ─────────────────────────────
dom.settingsBtn.addEventListener('click', () => {
  dom.apiInput.value = apiKey;
  openModal();
});

dom.saveKeyBtn.addEventListener('click', saveKey);
dom.apiInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') saveKey();
});

// Close modal by clicking backdrop (only if key exists)
dom.modal.addEventListener('click', e => {
  if (e.target === dom.modal && apiKey) closeModal();
});

function saveKey() {
  const val = dom.apiInput.value.trim();
  if (!val) return;
  apiKey = val;
  localStorage.setItem('focusnest_key', val);
  closeModal();
  showToast('API key saved 🔑');
}
function openModal() {
  dom.modal.classList.remove('hidden');
  setTimeout(() => dom.apiInput.focus(), 60);
}
function closeModal() {
  dom.modal.classList.add('hidden');
}

// ── Task breakdown trigger ────────────────────
dom.breakdownBtn.addEventListener('click', runBreakdown);
dom.taskInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    runBreakdown();
  }
});

async function runBreakdown() {
  const task = dom.taskInput.value.trim();
  if (!task)   { dom.taskInput.focus(); return; }
  if (!apiKey) { openModal(); return; }

  setLoading(true);
  try {
    const stepTexts = await callClaude(task);
    renderSteps(stepTexts);
  } catch (err) {
    console.error(err);
    showToast('Something went wrong — check your API key ⚙');
  } finally {
    setLoading(false);
  }
}

// ── Claude API call ───────────────────────────
// Prompt is tuned for ADHD: micro-steps, concrete verbs, no vagueness.
async function callClaude(task) {
  // Cycle loading messages while waiting
  const interval = setInterval(() => {
    dom.loadingText.textContent =
      LOADING_PHRASES[Math.floor(Math.random() * LOADING_PHRASES.length)];
  }, 1500);

  let res;
  try {
    res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':    'application/json',
        'x-api-key':       apiKey,
        'anthropic-version': '2023-06-01',
        // Required for direct browser-to-API calls
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model:      'claude-sonnet-4-20250514',
        max_tokens: 800,
        system: `You are a compassionate productivity assistant for someone with ADHD. 
Your job is to make tasks feel manageable and un-scary. 
Break every task into micro-steps that feel almost too easy to start — 
because starting is the hardest part.`,
        messages: [{
          role: 'user',
          content: `Break this task into exactly 6 tiny micro-steps.

Rules:
- Each step must start with a strong, concrete action verb (Open, Write, Copy, Click, Type, Read, Delete, Save, Set, Find...)
- Each step must take under 5 minutes to complete
- Each step must be so specific that there is zero ambiguity about what to do
- No vague phrases like "think about", "consider", "plan", or "work on"
- Make each step feel almost embarrassingly small — that's the goal

Return ONLY a valid JSON array of exactly 6 strings. 
No markdown, no explanation, no preamble. Just the array.

Task: "${task}"`,
        }],
      }),
    });
  } finally {
    clearInterval(interval);
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `API error ${res.status}`);
  }

  const data  = await res.json();
  const raw   = data.content?.[0]?.text?.trim() ?? '[]';
  const clean = raw.replace(/```(?:json)?|```/g, '').trim();
  return JSON.parse(clean);
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
    li.style.animationDelay = `${i * 70}ms`;
    dom.steps.appendChild(li);
  });

  updateProgress();
  highlightActive();
}

function buildStepEl(step, i) {
  const li = document.createElement('li');
  li.className = 'step';
  li.dataset.i = i;

  // Custom checkbox
  const box = document.createElement('div');
  box.className  = 'check-box';
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
  label.className      = 'step-label';
  label.contentEditable = 'true';
  label.spellcheck     = true;
  label.textContent    = step.text;
  label.addEventListener('input', () => { steps[i].text = label.textContent.trim(); });
  label.addEventListener('keydown', e => {
    if (e.key === 'Enter') e.preventDefault(); // no newlines
  });

  li.append(box, label);
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

    // Random encouragement ~65% of the time
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

// Highlight the next undone step (the one "in the lamp light")
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
  dom.progressFill.style.width    = `${pct}%`;
  dom.progressCount.textContent   = `${done} / ${total}`;
}

// ── All done ──────────────────────────────────
function showDone() {
  dom.doneState.classList.remove('hidden');
  dom.lamp.classList.add('bright'); // glow intensifies
}

dom.resetBtn.addEventListener('click', () => {
  steps = [];
  dom.steps.innerHTML = '';
  dom.taskInput.value = '';
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
    dom.loadingText.textContent = LOADING_PHRASES[0];
  }
}

// ── Toast ─────────────────────────────────────
let toastTimer = null;
function showToast(msg) {
  dom.toast.textContent = msg;
  dom.toast.classList.remove('hidden');
  void dom.toast.offsetWidth; // force reflow to restart transition
  dom.toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    dom.toast.classList.remove('visible');
    setTimeout(() => dom.toast.classList.add('hidden'), 300);
  }, 3000);
}
