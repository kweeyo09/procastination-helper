# FocusNest 🕯️

> Break big scary tasks into tiny, manageable steps. Built for ADHD brains.

FocusNest is a cosy, lo-fi web app that uses Claude AI to break overwhelming tasks into 6 tiny micro-steps. Each step is designed to take under 5 minutes, start with a clear action verb, and feel almost too easy to begin — because starting is the hardest part.

---

## Features

- **AI-powered breakdown** — Claude generates 6 tiny, specific steps with concrete action verbs
- **Editable steps** — click any step to tweak the wording
- **Active step highlight** — the next step glows like a lamp is shining on it
- **Progress bar** — amber fill, satisfying to watch
- **Encouragement toasts** — small kind messages as you tick things off
- **Lamp glow** — dark cosy study room aesthetic, glow intensifies when you finish
- **Zero install** — pure HTML/CSS/JS, just open the file

---

## Getting started

### 1. Clone the repo

```bash
git clone https://github.com/kweeyo09/procastination-helper.git
cd procastination-helper
```

### 2. Open in your browser

**Option A — direct open** (works in most cases)
```bash
open index.html       # macOS
start index.html      # Windows
xdg-open index.html   # Linux
```

**Option B — local server** (use this if the API call fails)
```bash
npx serve .
# → open http://localhost:3000
```

Or with Python:
```bash
python -m http.server 8080
# → open http://localhost:8080
```

### 3. Add your Anthropic API key

1. Get a free key at [console.anthropic.com](https://console.anthropic.com)
2. Click the **⚙ icon** in the app
3. Paste your key — it's saved to your browser's `localStorage` only, never sent anywhere except Anthropic

---

## How to use it

1. Type a big, overwhelming task into the box
2. Press **Break it down ✦** (or hit Enter)
3. Claude returns 6 micro-steps — each under 5 minutes, crystal clear
4. Click any step text to edit it
5. Tick steps off one by one
6. Breathe. You did it.

---

## File structure

```
focusnest/
├── index.html   — page structure
├── style.css    — dark lo-fi study room styles
├── app.js       — Claude API + all app logic
└── README.md    — this file
```

---

## Customising the AI

The prompt lives in `callClaude()` inside `app.js`. Easy things to change:

| Thing to change | Where |
|---|---|
| Number of steps | Change `exactly 6` in the prompt |
| Step length limit | Change `5 minutes` in the rules |
| Tone / personality | Edit the `system` prompt |
| Model | Change `claude-sonnet-4-20250514` |

---

## Security note

This app calls the Anthropic API directly from the browser using the `anthropic-dangerous-direct-browser-access` header — designed for exactly this kind of local/personal tool. Your key lives in `localStorage` and is only used for calls to Anthropic.

To stay safe:
- Set [usage limits](https://console.anthropic.com/settings/limits) on your key
- Don't share your browser profile with untrusted people while the key is stored

---

## Tech stack

- Pure HTML / CSS / JavaScript — no frameworks, no build step
- [Anthropic Claude API](https://docs.anthropic.com/)
- Google Fonts: [Playfair Display](https://fonts.google.com/specimen/Playfair+Display), [DM Sans](https://fonts.google.com/specimen/DM+Sans), [Caveat](https://fonts.google.com/specimen/Caveat)

---

## License

MIT — do whatever you want with it.
