# The Rehearsal Room — deploy guide

You already have: a GitHub account, a Supabase project, a Vercel account, and a Gemini API key.
Follow these steps in order — each one only takes a minute or two.

## 1. Set up the database (Supabase)

1. Open your Supabase project → **SQL Editor** → **New query**.
2. Paste the entire contents of `supabase_schema.sql` (in this folder) and click **Run**.
   This creates the `scenarios` and `attempts` tables and locks them down with row-level
   security, so every user can only ever see their own data.
3. (Optional but recommended for a quick personal deploy) Go to **Authentication → Providers → Email**
   and turn off **"Confirm email"** if you don't want to deal with confirmation emails right away.
   You can turn it back on later once you're comfortable with Supabase's email setup.
4. Go to **Project Settings → API**. Copy two values — you'll need them in the next step:
   - **Project URL**
   - **anon public** key

## 2. Wire the frontend to your Supabase project

1. Open `index.html` in this folder.
2. Near the top of the `<script type="module">` block, find:
   ```js
   const SUPABASE_URL = "YOUR_SUPABASE_URL";
   const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
   ```
3. Replace both placeholders with the values you copied in step 1.4.
   (The anon key is safe to leave in frontend code — Supabase's row-level security is what
   actually protects the data, not secrecy of this key.)

## 3. Push to GitHub

From this folder:
```bash
git init
git add .
git commit -m "Rehearsal Room app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/rehearsal-room.git
git push -u origin main
```
(Create the empty repo on github.com first if you haven't.)

## 4. Deploy on Vercel

1. Go to vercel.com → **Add New → Project** → import the GitHub repo you just pushed.
2. Leave the framework preset as **Other** — no build step is needed.
3. Before clicking Deploy, open **Environment Variables** and add:
   - `GEMINI_API_KEY` = your Gemini key from Google AI Studio
   - (optional) `GEMINI_MODEL` = a specific model name if you want to override the default
     (`gemini-flash-latest`, Google's self-updating alias for the current flash model).
4. Click **Deploy**. In about a minute you'll get a live URL like `rehearsal-room.vercel.app`.

That's it — that URL is shareable with anyone. Each person who visits it signs up for their
own account and only ever sees their own scenarios and attempts.

## Updating later

Any time you want to change something, edit the files and:
```bash
git add .
git commit -m "describe your change"
git push
```
Vercel redeploys automatically on every push to `main`.

## Notes

- **Cost**: with the free tiers, this costs $0 to run for personal/small-group use. Supabase's
  free tier and Gemini's free tier both have generous limits for this kind of low-volume app —
  just be aware both providers can change their free-tier limits over time.
- **Custom domain**: in Vercel, go to your project → **Settings → Domains** to attach one if
  you have it.
- **If Gemini responses ever come back empty**: double check the `GEMINI_MODEL` env var against
  Google's current free-tier list — model names get retired/renamed periodically, and the
  serverless function will surface the exact error message from Google if the key or model is wrong.
