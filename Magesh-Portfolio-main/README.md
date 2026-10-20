# Magesh Kumar E — Portfolio

Static site (HTML/CSS/JS) plus one serverless function for the **Magi AI** chatbot.

```
index.html                         page markup
css/style.css                      portfolio styles (+ responsive rules at the end)
css/chatbot.css                    Magi AI styles
js/script.js                       background, cursor, tilt, reveal, contact form, mobile menu
js/chatbot.js                      Magi AI front end (talks only to /api/chat)
api/chat.js                        backend — holds the OpenRouter key, server-side only
assets/Magesh-Kumar-E-Resume.pdf   resume opened by the "View My Resume" buttons
dev-server.js                      optional local server for testing the chatbot
```

## Run locally (chatbot needs its backend running)
Live Server alone only serves the page; Magi AI also needs `dev-server.js` running.

1. Install Node.js 18+ (nodejs.org).
2. In the project folder, copy `.env.example` to a new file named exactly `.env`
   (Windows PowerShell: `copy .env.example .env`) and paste your OpenRouter key after `OPENROUTER_API_KEY=`.
3. Run `node dev-server.js` and open **http://localhost:3000**
   (the page also works from Live Server on :5500 while this is running).

## Deploy (Vercel)
1. Push to GitHub (`.env` is git-ignored, so the key never goes in the repo).
2. Import the repo in Vercel.
3. Project → Settings → Environment Variables → add `OPENROUTER_API_KEY`, then redeploy.
   Optional: `OPENROUTER_MODEL`, `SITE_URL`, `ALLOWED_ORIGINS`.
