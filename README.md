# Social Platform Starter

GitHub-ready Next.js starter with Discord authentication through Supabase.

## Included
- Landing/home page
- Discord login + logout
- OAuth callback route
- Cookie-backed Supabase SSR session
- Account dropdown
- Protected Account Settings page
- Search placeholder ready for a later phase
- Responsive dark UI
- `.gitignore` and `.env.example`

## 1. Supabase + Discord
You should already have Discord enabled in Supabase Authentication and the Supabase provider callback added to Discord OAuth Redirects.

In Supabase, open **Authentication → URL Configuration**.
For local development set Site URL to `http://localhost:3000` and add `http://localhost:3000/auth/callback` to allowed redirect URLs.
After Vercel deployment, add `https://YOUR-DOMAIN/auth/callback` as an allowed redirect URL and set the production Site URL appropriately.

## 2. Environment variables
Copy `.env.example` to `.env.local` and fill in only:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Find these in your Supabase project's API settings/connect dialog. The publishable key is designed for client use. **Do not use the service-role/secret key in this website.**

## 3. Run locally
```bash
npm install
npm run dev
```
Open `http://localhost:3000`.

## 4. Upload to GitHub
Upload the project contents, but never upload `.env.local`. It is ignored by Git.

## 5. Deploy to Vercel
Import the GitHub repository in Vercel. Add the same two environment variables in Vercel Project Settings → Environment Variables, then deploy.

After deployment, update Supabase Authentication URL Configuration with your Vercel/custom domain callback as described above.

## Security notes
- Discord Client Secret stays in Supabase's Discord provider configuration; it is not needed in this repository.
- Never expose a Supabase service-role/secret key to the browser.
- Future tables (profiles, posts, comments, follows, etc.) must have Row Level Security enabled with explicit policies before being exposed to clients.
- UI checks are not authorization. Sensitive actions must be enforced by server/database authorization.
- There is no meaningful "100% secure" website; keep dependencies patched, use least privilege, validate input, rate-limit sensitive endpoints, and review access policies as features are added.
