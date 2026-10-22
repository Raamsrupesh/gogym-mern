# GoGym — MERN

## Local Redis (Docker)
Start Redis with Docker; no local Redis installation is needed. In PowerShell:

```powershell
docker run -d `
  --name redis `
  -p 6379:6379 `
  -v redis-data:/data `
  --restart unless-stopped `
  redis:latest redis-server --appendonly yes
```

The named volume preserves Redis data, and `--appendonly yes` enables AOF persistence. Run the `docker run` command only once: Docker reports a name conflict if a container named `redis` already exists. Check its state with `docker ps -a --filter "name=^/redis$"`. If it is running, use it as-is; if it is stopped, start it with `docker start redis`. Check that Redis is ready with `docker exec redis redis-cli ping` (it should print `PONG`).

The backend connects to `redis://localhost:6379` by default, so no Redis URL needs to be added to `server/.env`. Set `REDIS_URL` only if you need to override the default (for example, when using a hosted Redis service).

## Backend
Open a PowerShell terminal at the project root, then run:

```powershell
cd server
Copy-Item .env.example .env
npm install
npm run seed
npm run dev
```

Fill in the required values in `server/.env` before running the seed command. The API runs at `http://localhost:5000`.

## Frontend
In a **second** PowerShell terminal at the project root, run:

```powershell
cd client
npm install
npm run dev
```

The frontend runs at `http://localhost:5173`.

## Backend structure
- `server/routes/` maps HTTP methods and URL paths to middleware and controller functions.
- `server/controllers/` contains the request handling logic. Controller names describe their action, such as `createRazorpayOrder` or `checkInMember`.
- `server/models/` defines MongoDB data, while `server/services/` contains integrations such as Razorpay and PDF generation.
- The backend uses native JavaScript ES modules (`import` / `export`).

## Member and trainer features
- Owner and staff (trainer) workspaces are available at `/admin` and `/trainer`. Members use the member dashboard.
- Feature APIs are mounted under `/api/features`: attendance history and leaderboard; workout plans and performance; trainer notes; diet guidance; transformations; referrals; equipment; feedback; and in-app notifications.
- QR generation, QR scanning, and manual check-in have been removed. Existing attendance records and the monthly/weekly leaderboard remain available. No fingerprint-device connection has been added yet; the device/database details are needed before that integration can be implemented.
- Mark a plan as including diet guidance in Admin → Plans. The entitlement is snapshotted when a membership is created and checked again on the server before diet plans can be read or assigned.
- Transformation photos are stored in `server/uploads/transformations` and served only through an authenticated, authorization-checked endpoint. Use persistent, private storage and include this directory in backups for production deployments.
- Automatic membership reminders run daily at 08:30 Asia/Kolkata. Owners can also schedule and delete member reminders from Admin → Reminders; scheduled reminders are sent by email when due. Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `MAIL_FROM` for email delivery. Delivery attempts and failures are visible in the admin workspace.
- When referrals are enabled in Admin → Operations → Referrals, the owner configures separate new-member and referrer discounts. The new member's discount applies to their first successful online membership checkout; after that payment, the referrer receives a credit for their next online membership checkout. Offline payments remain recorded at the amount entered by the owner.
- The chatbot uses active plans, public business settings, platform feature details, and owner-provided general guidance from Admin → Settings. For a signed-in member, answers about their published trainer notes, workouts, performance, attendance, membership, and referrals are assembled server-side and are not sent to Gemini. Keep personal or confidential information out of owner-provided guidance. Configure `GEMINI_API_KEY` and `GEMINI_MODEL` for general AI answers.
- Referral claims are disabled by default. Enable them and configure the reward description in Admin → Operations → Referrals.
- Mongoose creates the new feature collections and indexes as the models are used. Existing attendance records are retained for history and future fingerprint integration.
- See [FEATURES.md](./FEATURES.md) for the current feature inventory. Update it alongside any feature changes.

## Contact links
- Set the gym's WhatsApp number, including its country code, in Admin Settings. The footer uses a demo number until one is configured.
- Replace the sample LinkedIn, Instagram, and Facebook profile links in `client/src/components/Footer.jsx` with the gym's official social profiles.

## Deployment
- Backend: Railway / Render / Fly / any Node host. Set env vars, including `REDIS_URL` for hosted Redis. Use MongoDB Atlas + Redis (Upstash/Redis Cloud).
- Frontend: Vercel / Netlify / Cloudflare Pages. Set `VITE_API_URL` if not same-origin, or point a rewrite `/api/*` at the backend.
- Razorpay: add webhook URL `https://<your-api>/api/razorpay/webhook` in Razorpay dashboard; copy the webhook secret into env.
- Gemini: set `GEMINI_API_KEY`.
- SMTP: set credentials (Gmail app password, Resend SMTP, or any SMTP).