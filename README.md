# Travelia

**Travelia** is a full-stack travel guide and booking platform. Travelers discover destinations, verify their passport once, plan trips, and book activities. Administrators manage content, verify users, and monitor operations from a dedicated dashboard.

Built with **Next.js 16**, **TypeScript**, **MongoDB**, and **Mongoose**, using a **mobile-first** design system.

<p align="center">
  <img src="public/travelia-logo.png" alt="Travelia logo" width="160" />
</p>

## Team

| Name | Role |
|------|------|
| Fatima Ghazzawi | Developer |
| Yasser Kayed | Developer |
| Sumaya Aboud | Developer |

## Features

### Client (Traveler)

- Browse landing page, destinations, and explore-by-mood
- Register (3-step flow), login, forgot password
- Personal dashboard: trips, bookings, favorites, budget, checklist, visited places
- One-time passport upload and admin verification before booking
- Book destinations and activities (one booking = one traveler)
- Pay with **Stripe Checkout**; booking confirms when the webhook reports payment success

### Admin

- Analytics dashboard (destinations map, verification funnel, capacity, booking trends)
- Manage users, passport verification (approve / reject)
- CRUD for destinations, activities, categories, moods
- Oversee bookings, payments, reviews, and notifications

## Tech stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| UI | React 19, Tailwind CSS 4 |
| Database | MongoDB + Mongoose 9 |
| Validation | Zod 4 |
| Auth | Auth.js v5 (JWT), Credentials + Google OAuth |
| Auth / security | bcryptjs, rate-limiter-flexible, XSS sanitize, secure cookies |
| Forms | React Hook Form + Zod |
| Email | Nodemailer (dev) / Resend (prod) |
| Payments | Stripe Checkout + webhooks |
| Logging | Winston |

## Project structure

```
travelia/
├── docs/                    # UI mockups, ERD, generated PDFs
├── public/                  # Static assets (logo, images)
├── scripts/                 # PDF documentation generators
├── src/
│   ├── app/
│   │   ├── (public)/        # Landing, destinations, login
│   │   ├── (traveler)/      # Customer dashboard (/dashboard)
│   │   ├── (admin)/         # Admin panel (/admin)
│   │   └── api/             # API routes
│   ├── components/ui/       # Shared UI primitives
│   ├── lib/                 # DB, API helpers, security, logger
│   ├── models/              # Mongoose schemas (14 collections)
│   ├── validators/          # Zod schemas mirroring models
│   └── types/               # Shared TypeScript types
├── .env.example
└── package.json
```

## Getting started

### Prerequisites

- **Node.js** 20+
- **MongoDB** 6+ (local or Atlas)
- **npm** (or pnpm / yarn)

### Installation

```bash
git clone <repository-url>
cd travelia
npm install
```

### Environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env.local
```

| Variable | Description |
|----------|-------------|
| `NODE_ENV` | `development` or `production` |
| `MONGODB_URI` | MongoDB connection string |
| `NEXT_PUBLIC_APP_URL` | Public app URL (e.g. `http://localhost:3000`) |
| `CORS_ORIGINS` | Comma-separated allowed origins |
| `AUTH_SECRET` | Auth.js secret (`openssl rand -base64 32`) |
| `AUTH_URL` | Auth base URL (usually same as app URL) |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google OAuth credentials |
| `EMAIL_PROVIDER` | `nodemailer`, `elasticemail`, or `resend` |
| `EMAIL_FROM` | From address for transactional email (must be verified with your provider) |
| `ELASTIC_EMAIL_USERNAME` / `ELASTIC_EMAIL_API_KEY` | Elastic Email account email + API key |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | SMTP relay (Mailpit, Elastic Email, etc.) |
| `RESEND_API_KEY` | Production email via Resend |
| `STRIPE_SECRET_KEY` | Stripe secret key (`sk_test_…` / `sk_live_…`) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (`pk_test_…` / `pk_live_…`) |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret (`whsec_…`) from Dashboard or `stripe listen` |

### Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

| Route | Description |
|-------|-------------|
| `/` | Public landing |
| `/destinations` | Destination listing |
| `/login` | Sign in (credentials + Google) |
| `/register` | Create account |
| `/forgot-password` | Request password reset |
| `/reset-password` | Set new password |
| `/verify-email` | Confirm email from link |
| `/dashboard` | Traveler dashboard (auth required) |
| `/admin` | Admin dashboard (ADMIN role) |
| `/api/health` | Health check (+ DB) |
| `/api/auth/*` | Auth.js + register / reset / verify APIs |

### Other scripts

```bash
npm run build          # Production build
npm run start          # Start production server
npm run lint           # ESLint
npm run format         # Prettier write
npm run format:check   # Prettier check
```

## Authentication

Auth.js v5 with **JWT sessions** (no database sessions). Roles: `TRAVELER` | `ADMIN`.

- Credentials login requires `emailVerified === true`
- Google OAuth auto-creates travelers with `emailVerified: true`
- Passport travel verification (`isVerified`) remains separate from email verification
- Middleware protects `/dashboard/**` and `/admin/**`

**Dedicated docs:**

- [Authentication & authorization architecture](docs/authentication.md) — flows, JWT claims, file map, env vars
- [Auth security checklist](docs/auth-security-checklist.md) — implemented controls, limitations, operational checks
- [Auth + Email teaching PDF](docs/Travelia-Auth-Authorization-Email.pdf) — full guide (concepts, implementation, checklists); regenerate with `python scripts/generate_auth_email_pdf.py`
- [Rendering strategy](docs/rendering-strategy.md) — when to use SSG, ISR, Dynamic SSR, and client islands

Server helpers: `getCurrentUser()`, `requireAuth()`, `requireAdmin()`, `requireTraveler()`  
Client hooks: `useCurrentUser()`, `useIsAdmin()`, `useIsTraveler()`

## Data model

14 MongoDB collections:

`users` · `categories` · `moods` · `destinations` · `activities` · `trips` · `bookings` · `payments` · `reviews` · `favorites` · `notifications` · `checklists` · `expenses` · `visitedPlaces`

Key business rules:

- **Passport verification** — Admin verifies a user's passport once (`verificationStatus: verified`). Required before any booking.
- **One seat per booking** — Each booking represents one traveler (the logged-in user). Capacity is tracked on destinations and activities.
- **Passport snapshot** — Bookings can store a passport snapshot when `usePassportDetails` is enabled.
- **Pay then confirm** — New bookings start as `pending` / `paymentStatus: pending`. Stripe webhook sets `confirmed` + `paid`. Expired/failed checkout cancels the booking and releases the seat.
- **Role-based access** — `customer` → `/dashboard/*`, `admin` → `/admin/*`.

See `docs/travelia-erd.png` for the entity-relationship diagram.

## Payments (Stripe)

Flow: create booking → `POST /api/payments/checkout` → **Embedded Checkout** modal on the same page → `POST /api/webhooks/stripe` confirms payment.

| Endpoint | Purpose |
|----------|---------|
| `POST /api/payments/checkout` | Authenticated traveler; body `{ bookingId }` → `{ clientSecret }` for Embedded Checkout |
| `POST /api/webhooks/stripe` | Stripe webhook (signature verified; no auth cookie) |

**Local webhook forwarding**

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copy the printed `whsec_…` into `.env.local` as `STRIPE_WEBHOOK_SECRET`.

**Dashboard / production:** add endpoint `https://your-domain/api/webhooks/stripe` and subscribe to at least:

- `checkout.session.completed`
- `checkout.session.expired`
- `payment_intent.payment_failed`
- `charge.refunded`

## Design system

Mobile-first UI with a teal-and-navy palette:

| Role | Hex |
|------|-----|
| Teal (primary) | `#127E83` |
| Sky blue | `#51A5D6` |
| Deep blue | `#002642` |
| Navy | `#012A3E` |
| Turquoise (accent) | `#34BDAF` |
| Success | `#19B67E` |
| Error | `#E4574A` |

Screen mockups live in `docs/` (`travelia-landing.png`, `travelia-login-ui.png`, etc.).

### Generate documentation PDFs

Requires Python 3 with `reportlab` (and `pillow` for the older UI/DB scripts if present):

```bash
pip install reportlab pillow
python scripts/generate_auth_email_pdf.py
```

Output:

- `docs/Travelia-Auth-Authorization-Email.pdf` — authentication, authorization, and email service (teaching guide)

## API conventions

- Responses use a consistent JSON envelope: `{ success, message, data, errors }`
- Input validated with Zod schemas in `src/validators/`
- Routes wrapped with `apiHandler` from `src/lib/api/handler.ts`
- Booking routes must call `assertUserCanBook()` from `src/lib/booking/eligibility.ts`

## Development status

| Area | Status |
|------|--------|
| Mongoose models & Zod validators | Done |
| Auth.js (JWT, credentials, Google) | Done |
| Register / verify email / forgot & reset password | Done |
| Role middleware (TRAVELER / ADMIN) | Done |
| Route shells (public, traveler, admin) | Scaffolded |
| MongoDB connection (`connectDB`) | Done |
| Full page UI from mockups | Pending |
| Booking APIs | Done |
| Stripe Checkout + webhook payments | Done |

## License

Private academic / team project. All rights reserved.
