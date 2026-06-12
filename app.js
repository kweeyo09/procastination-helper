// app.js — FocusNest
'use strict';

// ── Encouragements ────────────────────────────
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

// ── State ─────────────────────────────────────
let steps = [];
let pipe = null;
let modelState = 'idle'; // idle | downloading | ready | failed
let currentTask = '';
let currentSource = ''; // rule | learned | fallback | ai
let learnToastShown = false;

// ── DOM refs ──────────────────────────────────
const dom = {
  taskInput:      document.getElementById('task-input'),
  breakdownBtn:   document.getElementById('breakdown-btn'),
  progressRow:    document.getElementById('progress-row'),
  progressFill:   document.getElementById('progress-fill'),
  progressCount:  document.getElementById('progress-count'),
  loading:        document.getElementById('loading'),
  loadingText:    document.getElementById('loading-text'),
  steps:          document.getElementById('steps'),
  doneState:      document.getElementById('done-state'),
  resetBtn:       document.getElementById('reset-btn'),
  toast:          document.getElementById('toast'),
  lamp:           document.getElementById('lamp-glow'),
  aiNudge:        document.getElementById('ai-nudge'),
  aiEnableBtn:    document.getElementById('ai-enable-btn'),
  aiStatus:       document.getElementById('ai-status'),
  aiStatusText:   document.getElementById('ai-status-text'),
  aiProgressFill: document.getElementById('ai-progress-fill'),
  learnNote:      document.getElementById('learn-note'),
  suggestRow:     document.getElementById('suggest-row'),
  suggestLink:    document.getElementById('suggest-link'),
};

// ── Breakdown trigger ─────────────────────────
dom.breakdownBtn.addEventListener('click', runBreakdown);
dom.taskInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); runBreakdown(); }
});

async function runBreakdown() {
  const task = dom.taskInput.value.trim();
  if (!task) { dom.taskInput.focus(); return; }

  setLoading(true);
  await new Promise(r => setTimeout(r, 400 + Math.random() * 300));

  let result;
  if (pipe && modelState === 'ready') {
    const ai = await generateWithAI(task);
    result = ai ? { texts: ai, source: 'ai' } : breakdownLocally(task);
  } else {
    result = breakdownLocally(task);
  }

  currentTask = task;
  currentSource = result.source;
  learnToastShown = false;

  renderSteps(result.texts);
  setLoading(false);

  dom.learnNote.classList.toggle('hidden', result.source !== 'fallback');
  dom.suggestRow.classList.toggle('hidden', result.source !== 'fallback' && result.source !== 'learned');
  if (result.source === 'learned') showToast('Using steps you taught me ✦');
}

// ── Context extraction ────────────────────────
function extractContext(task) {
  const t = task.trim();
  const lower = t.toLowerCase();

  // Strip leading action verb + optional article to get the core subject
  const withoutVerb = t.replace(
    /^(writ(?:e|ing)|draft(?:ing)?|finish(?:ing)?|complet(?:e|ing)|do(?:ing)?|creat(?:e|ing)|mak(?:e|ing)|fix(?:ing)?|build(?:ing)?|start(?:ing)?|study(?:ing)?|read(?:ing)?|clean(?:ing)?|organis(?:e|ing)?|organiz(?:e|ing)?|plan(?:ning)?|send(?:ing)?|fill(?:ing)?|cod(?:e|ing)|debug(?:ging)?|implement(?:ing)?|prepar(?:e|ing)|prep(?:ping)?|repl(?:y|ying)|respond(?:ing)?|review(?:ing)?|updat(?:e|ing)|edit(?:ing)?|research(?:ing)?|find(?:ing)?|check(?:ing)?|film(?:ing)?|record(?:ing)?|design(?:ing)?|draw(?:ing)?|practic(?:e|ing)|practis(?:e|ing)|learn(?:ing)?)\s+(a\s+|an\s+|my\s+|the\s+|this\s+|some\s+|out\s+|to\s+|for\s+)?/i, ''
  ).trim();

  // Topic: what comes after "on", "about", "regarding"
  const aboutM = withoutVerb.match(/\b(?:on|about|regarding)\s+(.+?)(?:\s+(?:for|by|before|due)\b|\s*$)/i);
  const topic = aboutM ? aboutM[1].trim() : null;

  // Audience / context: "for my class", "for work", "for my boss" etc.
  const forM = lower.match(/\bfor\s+(my\s+)?(class|work|school|uni|university|college|client|boss|manager|teacher|professor|job|interview|project|course|exam|test|portfolio)\b/);
  const audience = forM ? forM[0].replace(/^for\s+(my\s+)?/, '').trim() : null;

  // Named entities: 2+ consecutive Title Case words
  const namedM = t.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g) || [];
  const named = namedM.length ? namedM[0] : null;

  // Core: most specific thing we found
  const raw = topic || named || withoutVerb;
  const core = raw.length > 52 ? raw.slice(0, 52).replace(/\s+\S*$/, '') + '…' : raw;

  const isUrgent = /\b(urgent|asap|quick|fast|tonight|today|now|immediately|by tomorrow)\b/i.test(lower);

  return { topic, audience, named, core, withoutVerb, isUrgent };
}

function brief(task, max = 42) {
  const cleaned = task
    .replace(/^(write|draft|finish|complete|do|create|make|fix|build|start|study|read|clean|organiz|plan|send|fill)\s+(a\s+|an\s+|my\s+|the\s+|this\s+|out\s+)?/i, '')
    .trim();
  return cleaned.length > max ? cleaned.slice(0, max) + '…' : cleaned;
}

// ── Rule-based breakdown engine ───────────────
const CATEGORIES = [
  {
    name: 'email',
    test: t => /\bemail\b|reply to|respond to|write.*message|send.*message|send.*email/.test(t),
    steps: task => {
      const ctx = extractContext(task);
      const lower = task.toLowerCase();
      const isReply = /reply|respond|answer/.test(lower);
      const recipient = ctx.audience ||
        (lower.includes('boss') ? 'your boss' :
         lower.includes('client') ? 'your client' :
         lower.includes('professor') ? 'your professor' : null);
      const about = ctx.topic ? ` about ${ctx.topic}` : '';
      const toWhom = recipient ? ` to ${recipient}` : '';

      return isReply ? [
        `Open the email thread${toWhom} right now — don't close it`,
        `Read their message once and identify the one thing they actually need from you`,
        `Start your reply with their name: "Hi [name]," — that alone breaks the block`,
        `Write your answer to the main point${about} in 2–4 sentences, nothing more`,
        `Add one clear next step at the end: what happens now, and by when`,
        `Read it once, check the tone sounds like you, then hit Send`,
      ] : [
        `Open a new email compose window${toWhom ? ' addressed to ' + recipient : ''}`,
        `Write the subject line first — one phrase that tells them exactly what this is${about}`,
        `Write one sentence: the single most important thing you need to say${about}`,
        `Add context around that sentence: why you're writing, what you need from them`,
        `Close with a specific ask — not "let me know" but exactly what you want and when`,
        `Read it once end-to-end, adjust tone if needed, then Send`,
      ];
    },
  },
  {
    name: 'video',
    test: t => /\b(video|videos|vlog|footage|clip|clips|montage|reel|reels|short|shorts|youtube|tiktok|premiere|capcut|davinci|final cut|after effects)\b/.test(t),
    steps: task => {
      const ctx = extractContext(task);
      const lower = task.toLowerCase();
      const what = ctx.core;

      const isEditing = /\b(edit|editing|cut|cutting|trim|color|grade|montage|post)\b/.test(lower);
      const isFilming = /\b(film|filming|record|recording|shoot|shooting)\b/.test(lower);

      if (isEditing) return [
        `Open your editing app and drop the raw footage for "${what}" onto the timeline — nothing else yet`,
        `Watch the footage once through and mark the 3 strongest moments you definitely want to keep`,
        `Do a rough cut: delete dead air, false starts, and anything boring — speed over polish`,
        `Reorder the keeper clips so "${what}" actually flows as a story from start to end`,
        `One polish pass only: music or audio levels, transitions where cuts feel harsh, color if needed`,
        `Watch the whole edit once start to finish, fix only what genuinely bugs you, then export`,
      ];

      if (isFilming) return [
        `Write one sentence: what should someone know or feel after watching "${what}"?`,
        `Jot a loose shot list — 3 to 5 bullet points of what you need to capture`,
        `Set up your space: camera or phone position, light source in front of you, quick mic test`,
        `Record the first take of the opening — it will be bad, that's the warm-up, keep it anyway`,
        `Work through the rest of your shot list one bullet at a time`,
        `Review what you got before packing up — re-shoot only anything truly unusable`,
      ];

      return [
        `Decide the single point of "${what}" — one sentence, write it down`,
        `Sketch a loose outline: opening hook, 2–3 main beats, ending`,
        `Gather what you need in one place: footage, images, music, or your recording setup`,
        `Make the first 10 seconds — the hook is the hardest part, so do it first`,
        `Build the rest beat by beat, rough versions only — resist polishing as you go`,
        `Do one polish pass on the whole thing, then export or publish "${what}"`,
      ];
    },
  },
  {
    name: 'creative',
    test: t => /\b(design|draw|drawing|paint|sketch|illustrat|logo|poster|thumbnail|photoshop|figma|canva|animat|music|song|beat|melody|mix|master|compose|art|artwork)\b/.test(t),
    steps: task => {
      const ctx = extractContext(task);
      const what = ctx.core;
      return [
        `Open your tool of choice and create a blank canvas or file named after "${what}"`,
        `Spend 3 minutes collecting 2–3 references that have the vibe you want for ${what}`,
        `Make the ugliest possible rough version of ${what} — thumbnail-sized, zero pressure`,
        `Pick the part of the rough you like most and develop just that section`,
        `Build out the rest around it, working loose to tight — details come last`,
        `Step away for 2 minutes, come back, adjust the one thing that jumps out, then call it done`,
      ];
    },
  },
  {
    name: 'writing',
    test: t => /\b(write|draft|essay|blog|article|paragraph|letter|introduction|conclusion|report|caption|summarize|summarise|compose)\b/.test(t),
    steps: task => {
      const ctx = extractContext(task);
      const lower = task.toLowerCase();
      const what = ctx.core;
      const forWhat = ctx.audience ? ` for your ${ctx.audience}` : '';

      const type =
        lower.match(/\b(introduction|intro)\b/) ? 'introduction' :
        lower.match(/\bconclusion\b/) ? 'conclusion' :
        lower.match(/\bessay\b/) ? 'essay' :
        lower.match(/\breport\b/) ? 'report' :
        lower.match(/\bblog\b/) ? 'blog post' :
        lower.match(/\bletter\b/) ? 'letter' :
        lower.match(/\barticle\b/) ? 'article' :
        lower.match(/\bparagraph\b/) ? 'paragraph' : 'piece';

      return [
        `Open a blank document — don't touch formatting or title yet`,
        `Write this at the top: "The main point of this ${type} is: ___" and finish that sentence`,
        `List 3 things you know or want to say about ${what} — bullets, no sentences needed`,
        `Expand the first bullet into 2–3 full sentences about ${what}${forWhat} — rough is fine`,
        `Write the opening line: one sentence that makes someone want to read about "${what}"`,
        `Save what you have — even a rough draft of "${what}" is infinitely more than nothing`,
      ];
    },
  },
  {
    name: 'coding',
    test: t => /\b(code|debug|fix.*bug|\bbug\b|implement|build.*feature|write.*function|\bcomponent\b|refactor|deploy|\bscript\b|program|feature|function|api|endpoint)\b/.test(t),
    steps: task => {
      const ctx = extractContext(task);
      const lower = task.toLowerCase();
      const what = ctx.core;

      const isBug = /\b(bug|fix|debug|broken|crash|error|issue|not working|failing)\b/.test(lower);
      const isRefactor = /\b(refactor|clean up|reorganiz|rewrite|restructure)\b/.test(lower);

      if (isBug) return [
        `Open the file where "${what}" is happening — don't touch anything yet`,
        `Read the full error message. Write down the exact line number and error text`,
        `Add a console.log right before the failure — confirm the data you expect is actually there`,
        `Run it and reproduce the problem — make sure you can trigger it consistently`,
        `Make the smallest possible code change to fix just this error, nothing else`,
        `Test the fix, confirm the bug is gone, then remove your debug logs and commit`,
      ];

      if (isRefactor) return [
        `Open the file for "${what}" — read through it once without editing anything`,
        `Write a comment at the top: // Refactoring: ${what}`,
        `Identify the single biggest clarity or structure problem in the file — just one`,
        `Fix only that one thing, then run tests or manually verify nothing broke`,
        `Pick the next clearest problem and repeat — one isolated change at a time`,
        `Commit what you have with a message describing what specifically improved`,
      ];

      return [
        `Open your editor and find or create the file for "${what}"`,
        `Write a comment: // TODO: ${what}`,
        `Write just the function or component signature — no body, no logic yet`,
        `Fill in the simplest possible version that could work — don't over-engineer`,
        `Run it, read any errors one at a time, and fix the first one only`,
        `Once it works at all, commit — even a rough first version of "${what}" is progress`,
      ];
    },
  },
  {
    name: 'studying',
    test: t => /\b(study|revise|review|memorize|memorise|practice|practise|\bprep\b|exam|quiz|lesson|chapter|course)\b/.test(t),
    steps: task => {
      const ctx = extractContext(task);
      const lower = task.toLowerCase();
      const subject = ctx.topic || ctx.named || ctx.core;
      const isExam = /\b(exam|test|quiz)\b/.test(lower);

      return isExam ? [
        `Get all your ${subject} materials open in front of you right now`,
        `Write down the 5 topics most likely to appear in this ${lower.includes('quiz') ? 'quiz' : 'exam'} on ${subject}`,
        `For each topic, write one sentence in your own words — no looking at notes yet`,
        `Check your notes: what did you miss or get wrong in those sentences?`,
        `Do 3 practice questions or recall the key facts for ${subject} from memory`,
        `Write down the one thing about ${subject} you're least sure of — look it up now`,
      ] : [
        `Get your ${subject} notes or materials open right now — close other tabs`,
        `Write "${subject}" at the top of a blank page`,
        `Set a 10-minute timer and read the first section on ${subject} without pausing`,
        `Write 3 things you just learned about ${subject} in your own words — no copying`,
        `Write 1 question you still don't understand about ${subject}`,
        `Find the answer to that one question in your materials right now`,
      ];
    },
  },
  {
    name: 'cleaning',
    test: t => /\b(clean|tidy|organiz|organis|sort|declutter|vacuum|mop|laundry|dishes|hoover|sweep|wash)\b/.test(t),
    steps: task => {
      const lower = task.toLowerCase();
      const areaM = lower.match(/\b(room|kitchen|bathroom|desk|bedroom|living room|floor|counter|table|car|office)\b/);
      const where = areaM ? ` the ${areaM[0]}` : '';
      const isLaundry = /laundry|clothes|washing machine/.test(lower);
      const isDishes = /dishes|washing up|sink/.test(lower);

      if (isLaundry) return [
        `Gather all the laundry into one pile — don't sort yet, just get it in one place`,
        `Sort into exactly two piles: darks and lights`,
        `Put the bigger pile in first — close the door, start the machine`,
        `Set a phone alarm for when the cycle finishes so you actually move it`,
        `While it runs, fold and put away any already-clean laundry`,
        `Move the load to the dryer or hang it up the moment your alarm goes off`,
      ];

      if (isDishes) return [
        `Clear the sink: stack everything neatly on one side in a pile`,
        `Fill the sink with hot soapy water now`,
        `Wash glasses and cups first — they're quick and the momentum helps`,
        `Move to plates, then pots and pans last (greasiest always last)`,
        `Dry and stack as you go — don't let things pile up wet beside the sink`,
        `Wipe down the counter and the sink itself — you're done`,
      ];

      return [
        `Set a 10-minute timer right now — you only have to work for 10 minutes`,
        `Grab a bag and collect all obvious trash from${where || ' the space'} first`,
        `Clear all flat surfaces — desk, table, floor — pile things temporarily`,
        `Put exactly 5 items from the pile back where they belong`,
        `Wipe down one surface${where ? ' in' + where : ''} — just one`,
        `Take a photo — the progress is real and you deserve to see it`,
      ];
    },
  },
  {
    name: 'reading',
    test: t => /\b(read|finish reading|skim|chapter|book|paper|article)\b/.test(t),
    steps: task => {
      const ctx = extractContext(task);
      const lower = task.toLowerCase();
      const what = ctx.named || ctx.topic || ctx.core;
      const isPaper = /paper|article|journal|research/.test(lower);

      return isPaper ? [
        `Open "${what}" and read just the abstract and conclusion first — get the punchline`,
        `Skim all headings and subheadings — get the structure in your head before the detail`,
        `Read the introduction fully, one paragraph at a time`,
        `Skim the methods section: what did they actually do and why does it matter?`,
        `Read the results and discussion carefully — this is what "${what}" actually argues`,
        `Write 2 sentences: what "${what}" claims, and what you think about that claim`,
      ] : [
        `Find your place in "${what}" and open it right now — don't look at anything else`,
        `Read the chapter or section title and spend 30 seconds predicting what it covers`,
        `Read only the first 3 paragraphs of "${what}" — just those, nothing more`,
        `Keep reading until you reach a natural pause or section break`,
        `Write one sentence: what just happened or what you just learned about "${what}"`,
        `Bookmark your exact spot so you know where to pick up next time`,
      ];
    },
  },
  {
    name: 'exercise',
    test: t => /\b(workout|exercise|gym|run|jog|yoga|stretch|training|lifting|cardio|pushups|sit.ups|walk)\b/.test(t),
    steps: task => {
      const lower = task.toLowerCase();
      const isRun = /run|jog|cardio/.test(lower);
      const isWalk = /walk/.test(lower);
      const isYoga = /yoga|stretch|flexibility/.test(lower);
      const ctx = extractContext(task);
      const what = ctx.core;

      if (isRun) return [
        `Put on your running shoes right now — don't think about it, just do it`,
        `Fill a water bottle and leave it by the door`,
        `Walk for 3 minutes to warm up: legs loose, breathing easy`,
        `Pick up to a jog at a pace where you could hold a short sentence in conversation`,
        `Run for ${ctx.isUrgent ? '10' : '20'} minutes — pace doesn't matter, just keep moving`,
        `Walk for 3 minutes to cool down, then stretch your calves, quads, and hamstrings`,
      ];

      if (isWalk) return [
        `Put your shoes on right now — this is step one, that's it`,
        `Pick a route: a loop you know, or just "15 minutes out, turn back"`,
        `Walk at a pace that feels comfortable — no performance required`,
        `Leave your phone in your pocket unless you're listening to something`,
        `Notice three specific things you see along the way — it helps the walk feel real`,
        `When you get back, drink a glass of water`,
      ];

      if (isYoga) return [
        `Roll out your mat and sit on it — that's the hardest part done`,
        `Take 5 slow breaths: in for 4, hold for 2, out for 6`,
        `Do 3 cat-cow stretches to wake up your spine`,
        `Move through 3–5 poses at your own pace — let the body decide`,
        `Hold your most needed stretch for 60 seconds longer than feels comfortable`,
        `Lie flat on your back for 2 minutes — no phone, just breathe`,
      ];

      return [
        `Get changed into your workout clothes right now — this signals your body`,
        `Fill a water bottle and put it where you'll use it`,
        `Do a 2-minute warm-up: arm swings, leg circles, light jog in place`,
        `Start ${what} at 50% effort for the first set — ease in`,
        `Complete your main sets at full effort, resting 60–90 seconds between`,
        `Cool down: 2 minutes slow movement, then one long stretch per muscle group`,
      ];
    },
  },
  {
    name: 'meeting',
    test: t => /\b(meeting|presentation|present|pitch|interview|standup|prepare.*call|prep.*meeting)\b/.test(t),
    steps: task => {
      const ctx = extractContext(task);
      const lower = task.toLowerCase();
      const isInterview = /interview/.test(lower);
      const isPitch = /pitch|presentation|present/.test(lower);
      const what = ctx.topic || ctx.core;
      const forWhat = ctx.audience ? ` for your ${ctx.audience}` : '';

      if (isInterview) return [
        `Write the role and company at the top of a blank page`,
        `Write 3 things about this role or company you genuinely find interesting`,
        `Prepare your answer to "tell me about yourself" — keep it under 90 seconds`,
        `Write the 2 most relevant things you've done that directly match this role`,
        `Write one sharp question to ask them that shows you've done real research`,
        `Check your setup 10 minutes early: link, video, audio, and background`,
      ];

      if (isPitch) return [
        `Write one sentence: the entire point of this presentation in plain language`,
        `List the 3 things your audience needs to believe to agree with that sentence`,
        `Build one slide or one clear talking point around each of those 3 things`,
        `Write your opening line — the one that makes them lean forward${forWhat}`,
        `Rehearse out loud once, all the way through — time yourself`,
        `Check your tech: projector, clicker, backup PDF, audio, screen share`,
      ];

      return [
        `Write the meeting name and your role in it at the top of a blank page`,
        `List the 3 most important things to say or ask about "${what}"`,
        `Write one sentence: your single main point for this meeting${forWhat}`,
        `Note any numbers, names, or facts you'll need to reference`,
        `Check your setup: camera, mic, link, or room and dial-in code`,
        `Set an alarm for 5 minutes before it starts`,
      ];
    },
  },
  {
    name: 'form',
    test: t => /\b(fill|form|application|apply|submit|upload|registration|register|sign up)\b/.test(t),
    steps: task => {
      const ctx = extractContext(task);
      const what = ctx.core;
      return [
        `Open "${what}" right now — the actual form, page, or document`,
        `Read through it once without filling anything in — just understand its shape`,
        `Gather everything you'll need: ID numbers, dates, reference codes, card details`,
        `Fill in personal details first: name, email, address, phone — the easy fields`,
        `Work through the remaining required fields one by one — don't skip any`,
        `Read the whole thing end-to-end once, then submit`,
      ];
    },
  },
  {
    name: 'planning',
    test: t => /\b(plan|schedule|budget|outline|map out|organiz|organis|\blist\b)\b/.test(t),
    steps: task => {
      const ctx = extractContext(task);
      const what = ctx.core;
      return [
        `Open a blank document or notes app — one place, not three`,
        `Write "${what}" at the very top`,
        `Brain-dump everything related to "${what}" without editing — just list it all out`,
        `Circle or star the 3 most important items on that list`,
        `Put those 3 in order: what has to happen before anything else can?`,
        `Write the very first physical action you can take today on "${what}"`,
      ];
    },
  },
];

function defaultSteps(task) {
  const ctx = extractContext(task);
  const what = ctx.core;
  return [
    `Open whatever you need to get started on "${what}"`,
    `Write "${what}" somewhere visible: document, sticky note, or phone note`,
    `Write down the single thing that's blocking you from beginning right now`,
    `Do the smallest physical action that counts as starting "${what}"`,
    `Work on it for 5 minutes without stopping to evaluate how it's going`,
    `Before you close anything, write down what the very next step is`,
  ];
}

function breakdownLocally(task) {
  const t = task.toLowerCase().trim();
  for (const cat of CATEGORIES) {
    if (cat.test(t)) return { texts: cat.steps(task), source: 'rule' };
  }
  const learned = matchLearned(task);
  if (learned) return { texts: learned, source: 'learned' };
  return { texts: defaultSteps(task), source: 'fallback' };
}

// ── Personal learned library (localStorage) ───
// When a task misses every category and the user edits the generic
// steps, the edited version is saved here and reused for similar tasks.
const LEARNED_KEY = 'focusnest-learned';
const LEARNED_MAX = 40;
const STOPWORDS = new Set([
  'a', 'an', 'the', 'my', 'your', 'our', 'his', 'her', 'their', 'its',
  'for', 'to', 'of', 'on', 'in', 'at', 'by', 'with', 'and', 'or', 'but',
  'this', 'that', 'these', 'those', 'some', 'out', 'up', 'it', 'is', 'be',
  'do', 'get', 'got', 'need', 'have', 'want', 'about', 'all', 'new',
]);

function taskKeywords(task) {
  const words = task.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/);
  return [...new Set(words.filter(w => w.length > 2 && !STOPWORDS.has(w)))];
}

function loadLearned() {
  try { return JSON.parse(localStorage.getItem(LEARNED_KEY)) || []; }
  catch { return []; }
}

function saveLearnedList(list) {
  try { localStorage.setItem(LEARNED_KEY, JSON.stringify(list)); }
  catch { /* storage full or blocked — learning just won't persist */ }
}

function matchLearned(task) {
  const kws = new Set(taskKeywords(task));
  if (!kws.size) return null;

  let best = null;
  let bestScore = 0;
  for (const entry of loadLearned()) {
    const overlap = entry.keywords.filter(k => kws.has(k)).length;
    const needed = Math.min(2, entry.keywords.length);
    const score = overlap / entry.keywords.length;
    if (overlap >= needed && score > bestScore) { best = entry; bestScore = score; }
  }
  if (!best) return null;

  const ctx = extractContext(task);
  return best.steps.map(s => s.split('{{what}}').join(ctx.core));
}

function rememberCurrentBreakdown() {
  if (!currentTask || !steps.length) return;
  const keywords = taskKeywords(currentTask);
  if (!keywords.length) return;

  // Template out the task's subject so the saved steps generalize:
  // "import the footage for trip vlog" → "import the footage for {{what}}"
  const ctx = extractContext(currentTask);
  const texts = steps.map(s => {
    if (ctx.core.length < 4) return s.text;
    const esc = ctx.core.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return s.text.replace(new RegExp(esc, 'gi'), '{{what}}');
  });

  const sig = [...keywords].sort().join('|');
  const list = loadLearned();
  const existing = list.findIndex(e => e.sig === sig);
  const entry = { sig, keywords, steps: texts, updated: Date.now() };
  if (existing >= 0) list[existing] = entry;
  else list.push(entry);
  while (list.length > LEARNED_MAX) list.shift();
  saveLearnedList(list);

  if (!learnToastShown) {
    learnToastShown = true;
    showToast("Got it — I'll remember this kind of task ✦");
  }
}

let learnTimer = null;
function scheduleLearn() {
  if (currentSource !== 'fallback' && currentSource !== 'learned') return;
  clearTimeout(learnTimer);
  learnTimer = setTimeout(rememberCurrentBreakdown, 1200);
}

// ── Suggest this breakdown (GitHub issue) ─────
dom.suggestLink?.addEventListener('click', () => {
  const title = encodeURIComponent(`Breakdown suggestion: ${currentTask}`);
  const body = encodeURIComponent(
    `**Task:** ${currentTask}\n\n**Suggested steps:**\n` +
    steps.map((s, i) => `${i + 1}. ${s.text}`).join('\n') +
    `\n\n_Submitted from the FocusNest suggest button._`
  );
  dom.suggestLink.href =
    `https://github.com/kweeyo09/procastination-helper/issues/new?title=${title}&body=${body}`;
});

// ── Local AI (Transformers.js) ────────────────
const AI_MODEL = 'Xenova/LaMini-Flan-T5-248M';

// Few-shot prompt to guide the small model's output format
function buildPrompt(task) {
  return `Give exactly 6 specific, actionable steps to complete the task. Each step must start with an action verb and directly reference details from the task.

Task: write a cover letter for a software engineer job at a startup
Steps:
1. Open a blank document and find the job posting — keep it open beside you
2. Write your opening line: one sentence about why this specific startup excites you
3. Describe your most relevant experience that matches their stack or product area
4. Pick one specific project that shows your skills directly — name it, describe what it did
5. Write a closing paragraph with a clear ask: when you're available and what you'd love to discuss
6. Read it aloud once, cut any filler sentences, save it as PDF

Task: ${task}
Steps:`;
}

dom.aiEnableBtn?.addEventListener('click', loadAI);

const AI_FLAG = 'focusnest-ai-on';

async function loadAI() {
  if (pipe) return true;
  modelState = 'downloading';
  dom.aiNudge.classList.add('hidden');
  dom.aiStatus.classList.remove('hidden');
  updateAIStatus('Loading AI library…', 0);

  try {
    // Ask the browser not to evict the cached model under storage pressure
    navigator.storage?.persist?.().catch(() => {});

    // Transformers.js stores model files in Cache Storage under this name
    const cached = window.caches ? await caches.has('transformers-cache') : false;

    const { pipeline, env } = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2');
    env.allowRemoteModels = true;
    env.useBrowserCache  = true;

    updateAIStatus(
      cached ? 'Loading model from cache…' : 'Downloading model (first time only, ~480 MB)…',
      0.02
    );

    pipe = await pipeline('text2text-generation', AI_MODEL, {
      progress_callback: info => {
        if (info.status === 'progress' && info.total) {
          updateAIStatus(
            `${cached ? 'Loading model…' : 'Downloading model…'} ${Math.round((info.loaded / info.total) * 100)}%`,
            info.loaded / info.total
          );
        }
        if (info.status === 'done') updateAIStatus('Preparing model…', 0.98);
      },
    });

    modelState = 'ready';
    try { localStorage.setItem(AI_FLAG, '1'); } catch { /* private mode */ }
    updateAIStatus('AI ready ✦', 1);
    setTimeout(() => dom.aiStatus.classList.add('hidden'), 2000);
    showToast(cached ? 'Local AI ready ✦' : 'Local AI enabled — breakdowns are now smarter ✦');
    return true;
  } catch (err) {
    console.error('Transformers.js load failed:', err);
    modelState = 'failed';
    updateAIStatus('Download failed — using built-in rules', 0);
    setTimeout(() => {
      dom.aiStatus.classList.add('hidden');
      dom.aiNudge.classList.remove('hidden');
    }, 3500);
    return false;
  }
}

// If the user enabled AI before, restore it automatically — the model
// loads from the browser cache, so this is seconds, not a redownload.
if (localStorage.getItem(AI_FLAG) === '1') loadAI();

function updateAIStatus(text, pct) {
  dom.aiStatusText.textContent = text;
  dom.aiProgressFill.style.width = `${Math.round(pct * 100)}%`;
}

async function generateWithAI(task) {
  if (!pipe || modelState !== 'ready') return null;
  try {
    const out = await pipe(buildPrompt(task), {
      max_new_tokens: 320,
      num_beams: 4,
      early_stopping: true,
    });

    const raw = (out[0]?.generated_text || '').trim();

    const lines = raw
      .split('\n')
      .map(l => l.replace(/^\d+[\.\):\-]\s*/, '').replace(/^[-•*]\s*/, '').trim())
      .filter(l => l.length > 8 && l.length < 160 && /[a-zA-Z]/.test(l));

    return lines.length >= 4 ? lines.slice(0, 6) : null;
  } catch (err) {
    console.error('AI generation failed:', err);
    return null;
  }
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

  const num = document.createElement('span');
  num.className = 'step-num';
  num.textContent = String(i + 1).padStart(2, '0');

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

  const label = document.createElement('div');
  label.className       = 'step-label';
  label.contentEditable = 'true';
  label.spellcheck      = true;
  label.textContent     = step.text;
  label.addEventListener('input', () => {
    steps[i].text = label.textContent.trim();
    scheduleLearn();
  });
  label.addEventListener('keydown', e => { if (e.key === 'Enter') e.preventDefault(); });

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
    if (Math.random() > 0.35) showToast(KUDOS[Math.floor(Math.random() * KUDOS.length)]);
  } else {
    li.classList.remove('done');
    box.setAttribute('aria-checked', 'false');
  }

  updateProgress();
  highlightActive();
  if (steps.every(s => s.done)) setTimeout(showDone, 450);
}

function highlightActive() {
  dom.steps.querySelectorAll('.step').forEach(el => el.classList.remove('active'));
  const idx = steps.findIndex(s => !s.done);
  if (idx >= 0) dom.steps.querySelector(`[data-i="${idx}"]`)?.classList.add('active');
}

function updateProgress() {
  const done  = steps.filter(s => s.done).length;
  const total = steps.length;
  dom.progressFill.style.width  = `${total ? (done / total) * 100 : 0}%`;
  dom.progressCount.textContent = `${done} / ${total}`;
}

// ── All done ──────────────────────────────────
function showDone() {
  dom.doneState.classList.remove('hidden');
  dom.lamp.classList.add('bright');
}

dom.resetBtn.addEventListener('click', () => {
  steps = [];
  currentTask = '';
  currentSource = '';
  dom.steps.innerHTML   = '';
  dom.taskInput.value   = '';
  dom.progressRow.classList.add('hidden');
  dom.doneState.classList.add('hidden');
  dom.learnNote.classList.add('hidden');
  dom.suggestRow.classList.add('hidden');
  dom.lamp.classList.remove('bright');
  dom.taskInput.focus();
});

// ── Loading UI ────────────────────────────────
function setLoading(on) {
  dom.loading.classList.toggle('hidden', !on);
  dom.breakdownBtn.disabled    = on;
  dom.breakdownBtn.textContent = on ? 'Working…' : 'Break it down ✦';
  if (on) {
    dom.steps.innerHTML = '';
    dom.progressRow.classList.add('hidden');
    dom.doneState.classList.add('hidden');
    dom.learnNote.classList.add('hidden');
    dom.suggestRow.classList.add('hidden');
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
