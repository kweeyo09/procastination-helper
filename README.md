# FocusNest

> Break big scary tasks into tiny, manageable steps. Built for ADHD brains.

FocusNest is a warm, paper-toned web app that breaks overwhelming tasks into 6 micro-steps using a built-in rule-based engine. No API key, no account, no setup — just open it and go.

**Live:** [kweeyo09.github.io/procastination-helper](https://kweeyo09.github.io/procastination-helper/)

---

## Features

- **Built-in breakdown engine** — rule-based logic covers 10 task categories (writing, coding, studying, cleaning, reading, exercise, meetings, forms, planning, email) with a smart fallback for anything else
- **Editable steps** — click any step label to tweak the wording
- **Active step highlight** — terracotta left-bar accent tracks your current step
- **Progress bar** — mustard-to-terracotta gradient, satisfying to watch
- **Encouragement toasts** — small kind messages as you tick things off
- **Warm lamp glow** — brightens when you finish everything
- **Zero install** — pure HTML/CSS/JS, open in any browser

---

## Getting started

### Use it online

[kweeyo09.github.io/procastination-helper](https://kweeyo09.github.io/procastination-helper/)

### Run it locally

```bash
git clone https://github.com/kweeyo09/procastination-helper.git
cd procastination-helper
open index.html        # macOS
start index.html       # Windows
xdg-open index.html    # Linux
```

No server needed — it's a static file with no external dependencies at runtime.

---

## How to use it

1. Type a big, overwhelming task into the box
2. Press **Break it down ✦** (or hit Enter)
3. Get 6 micro-steps tailored to the type of task
4. Click any step text to edit it
5. Tick steps off one by one
6. Breathe. You did it.

---

## File structure

```text
focusnest/
├── index.html   — page structure
├── style.css    — paper/editorial design (Cormorant Garamond + Courier Prime)
├── app.js       — rule-based breakdown engine + all app logic
└── README.md    — this file
```

---

## How the breakdown engine works

`app.js` has a `CATEGORIES` array with 10 entries. Each has:
- a `test(t)` regex that checks the task text
- a `steps(task)` function that returns 6 tailored strings

On submit, the engine checks each category in order and returns the first match. If nothing matches, `defaultSteps()` returns a generic 6-step flow.

To add a new category, add an entry to `CATEGORIES`:

```js
{
  name: 'cooking',
  test: t => /\b(cook|recipe|bake|meal prep)\b/.test(t),
  steps: task => [
    `Check you have all the ingredients`,
    // ...5 more steps
  ],
},
```

---

## Tech stack

- Pure HTML / CSS / JavaScript — no frameworks, no build step
- Google Fonts: Cormorant Garamond, Courier Prime, DM Sans

---

## License

MIT — do whatever you want with it.
