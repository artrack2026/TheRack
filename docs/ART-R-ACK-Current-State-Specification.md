# ART-R-ACK Gallery / TheRack
## Current-State Architecture, Operating Model, and Roadmap

**Document status:** Current production source of truth  
**Application/repository:** TheRack  
**Purpose:** Guide Claude and future maintainers without replacing the existing stack  

> **Critical instruction:** This is an existing, partially deployed application. Extend the current architecture. Do not introduce Prisma, Cognito, Auth.js, Stripe Checkout, CloudFront, KMS, new route conventions, or new roles unless a separate migration or feature project is explicitly approved.

---

## 1. Current Production Stack

| Area | Current implementation |
|---|---|
| Framework | Next.js |
| Database | Supabase Postgres |
| Database access | `supabase-js`; no Prisma |
| Authentication | Supabase Auth |
| Authorization | Supabase Row Level Security plus application-level checks |
| Roles | `customer` and `admin` |
| Customer portal | `/portal` |
| Product page | `/shop/[id]` using product UUID |
| Product URL model | UUID; no slug field currently |
| Inventory state | Existing `stock_count` and `featured` fields |
| Media storage | Amazon S3 through `@aws-sdk/client-s3` |
| Media delivery | Direct S3 implementation unless the repository proves otherwise |
| MFA/verification | Textbelt SMS OTP with Supabase email fallback |
| Payment system | `showroom_settings.payment_methods` manual/instruction-based system |
| Stripe | Placeholder type only; not an implemented integration |
| Validation | Hand-written per route; Zod not installed |
| Rate limiting / spam protection | DB-backed fixed-window limiter (`rate_limit_windows` table + `increment_rate_limit()` Postgres function, called via `lib/rate-limit.ts`); a honeypot field on the inquiry form. No third-party service. |
| Deployment | Vercel |
| Source control | GitHub |
| Transactional email | Resend where configured in the repository; otherwise verify before use |

---

## 2. Architecture Rules

1. **Preserve Supabase.** Use Supabase migrations, existing helpers, and RLS policies. Do not add Prisma or `schema.prisma`.
2. **Preserve current routes.** Use `/portal` and `/shop/[id]`. Route migration requires redirects and explicit approval.
3. **Preserve current roles.** Use `customer` and `admin`. An Editor role is roadmap work, not a current assumption.
4. **Keep RLS central.** Every new table or protected action needs ownership/role policies and server-side checks.
5. **Preserve the current MFA flow.** Extend the Textbelt/Supabase fallback implementation rather than replacing it casually.
6. **Do not claim Stripe exists.** The current payment model is configurable manual/instruction-based payment methods.
7. **Treat CloudFront and KMS as optional future hardening.** Direct S3 is the current implementation unless repository inspection confirms otherwise.
8. **Avoid large rewrites.** New work should be incremental, testable, and compatible with the live application.
9. **Preserve the DB-backed rate-limiting pattern.** Extend `lib/rate-limit.ts` and `rate_limit_windows` for new public routes rather than introducing Upstash, Cloudflare Turnstile, reCAPTCHA, or another third-party abuse-prevention service without explicit approval.

---

## 3. Security and Authorization Model

### Customer

May access public content and customer-owned records in `/portal`. Customer access must be limited through RLS and ownership checks.

### Admin

May access protected management functions, inventory, orders, settings, and sensitive account operations. Admin actions should require verified authentication and the existing OTP/MFA controls where configured.

### Required protected-action sequence

```text
Authenticate with Supabase
→ load trusted user and role
→ enforce RLS/ownership
→ validate request data
→ perform the minimum required action
→ return sanitized data
→ record a security or operational event where appropriate
```

Do not rely on hidden buttons or browser-supplied role values.

---

## 4. Current Functional Areas

### Public storefront

- Home page
- Shop/catalog
- Product detail at `/shop/[id]`
- Existing cart drawer
- About/contact content already present in the live scope
- Inquiry form (general contact and per-product) has honeypot and rate-limit protection — see §8

### Customer portal

- Located at `/portal`
- Uses Supabase Auth sessions
- Must expose only the signed-in customer's records
- Profile or phone changes must retain the existing verification safeguards

### Admin functions

- Product and inventory management
- Customer/order management present in the repository
- Showroom and payment-method settings
- Media operations through S3
- Security-sensitive actions using the existing verification system

The exact current pages and tables should always be confirmed by repository inspection before modification.

---

## 5. Existing Payment Model

The current application uses `showroom_settings.payment_methods` to describe supported payment methods and customer instructions.

Rules:

- Do not import Stripe packages or create Stripe environment variables unless the owner approves a Stripe implementation project.
- Treat any `stripe` payment-method value as a placeholder until backend processing, webhooks, order reconciliation, refunds, and security are implemented.
- Prices and inventory must still be validated server-side.
- Unique pieces should be protected from conflicting sales using the strongest reservation/transaction controls compatible with the existing schema.

### Future payment integration checklist

If Stripe or another processor is approved later, create a dedicated design that includes:

- Server-created payment sessions
- Signed webhook verification
- Idempotent event processing
- Payment/order reconciliation
- Refund controls
- Inventory reservation and release
- Failure and dispute handling
- Environment-secret management
- Address/ZIP-based tax calculation (see below — scope together, not separately)

### Combined project: payment processor + tax calculation

These two are deliberately one project, not two, because the tax mechanism depends on which
processor gets picked:

- **If Stripe is chosen:** Stripe Tax can calculate jurisdiction-correct tax as part of the same
  Checkout session — no separate tax vendor needed. Cheapest path if Stripe is the answer anyway.
- **If Square, PayPal, or a non-Stripe processor is chosen:** tax calculation needs its own vendor
  (TaxJar or Avalara are the standard choices), called separately from the payment step.
- **Do not build a standalone tax integration before the processor decision is made.** Building
  TaxJar/Avalara first and then choosing Stripe would mean paying for and maintaining a redundant
  tax vendor Stripe already includes.

Why not a static ZIP→rate table: ZIP codes don't align with tax jurisdictions (one ZIP can span
multiple counties/districts with different combined rates), and rates change quarterly in many
states. A hand-maintained table goes stale fast and creates real compliance exposure — this is a
"call a real tax API" problem, not a "load a data file" problem.

Current-codebase integration points this will touch, once scoped:

- `showroom_settings.tax_rate` — today a single flat manual rate; superseded (not just extended) by
  per-order calculated tax.
- `app/checkout/page.tsx` and `/api/orders` — tax is currently `subtotal * tax_rate`, calculated
  and trusted from `showroom_settings`; will need a server-side call to the processor's tax API
  using the shipping address before order total is finalized.
- Full shipping address is required for accurate calculation — ZIP alone is a fallback, not the
  primary input, when available.
- Admin Orders tab's Tax Rate field either goes away or becomes a fallback/override rather than
  the source of truth.

---

## 6. Media and S3

There are two separate S3 setups in the repository today, with separate credentials:

- **Public bucket** (`lib/s3.ts`) — product/artwork images. Presigned PUT for direct browser upload; reads are plain public URLs (`publicUrlForKey`). Env: `AWS_REGION`, `AWS_S3_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`.
- **Private bucket** (`lib/s3-private.ts`) — built for receipts/invoices. Presigned PUT *and* presigned GET (5-minute expiry) via `presignPrivateUpload` / `presignPrivateDownload`; there is no public bucket policy backing it, so every caller must confirm the requester owns the record (or is admin) before presigning a download. Env: `AWS_PRIVATE_REGION`, `AWS_PRIVATE_S3_BUCKET`, `AWS_PRIVATE_ACCESS_KEY_ID`, `AWS_PRIVATE_SECRET_ACCESS_KEY`.

**The private bucket and its signed-URL helpers already exist but are not wired into any route yet** — no API route currently calls `presignPrivateUpload` or `presignPrivateDownload`. Wiring them up (e.g. for order receipts) is incremental work on top of existing plumbing, not new architecture.

Maintain:

- Private AWS credentials only in server-side environment variables
- Least-privilege IAM
- Server-generated object keys
- File-size and file-type restrictions
- Safe filenames
- No AWS secrets in browser bundles
- Controlled deletion and replacement
- Clear separation between public artwork and private customer/admin files (already true at the bucket/credential level — see above)

Potential future hardening, subject to approval:

- CloudFront distribution in front of the public bucket
- Origin Access Control
- SSE-KMS customer-managed keys
- Image transformation pipeline
- Versioning and lifecycle rules

---

## 7. Validation Strategy

Validation is currently hand-written per route. Continue that pattern consistently unless a deliberate Zod adoption task is approved.

Every route should validate:

- Required fields
- Types and formats
- Length and numeric bounds
- Allowed enum values
- File restrictions
- Ownership and role
- Unexpected fields

A future Zod migration should be incremental and should not mix incompatible validation behavior without tests.

---

## 8. Rate Limiting and Spam Protection

Public, unauthenticated write routes are protected without any third-party service:

- **Mechanism:** `rate_limit_windows` table + `increment_rate_limit()` Postgres function (`security definer`, execute revoked from `anon`/`authenticated`, granted only to `service_role`). A fixed-window counter keyed by `(bucket, identifier, window)`, incremented atomically in one round trip — safe under concurrent serverless requests. Called from route handlers via `lib/rate-limit.ts` (`checkRateLimit`, `getClientIp`).
- **Identifier:** best-effort client IP from `x-forwarded-for` (client-influenceable, not spoof-proof, but raises the bar for casual scripted abuse).
- **Fail-open by design:** if the rate-limit check itself errors (e.g. the migration hasn't been run in an environment yet), the request is allowed through. A broken limiter must never be the reason a genuine customer's inquiry or order fails.

Current limits:

| Route | Bucket | Limit |
|---|---|---|
| `/api/inquiries` | `inquiry` | 4 requests / 10 minutes per IP |
| `/api/orders` (guest checkout) | `guest_checkout` | 5 requests / 30 minutes per IP |
| `/api/auth/guest-account` | `guest_account` | 5 requests / 60 minutes per IP |

`/api/inquiries` additionally has a honeypot field (`company`) on the client form (`components/InquiryForm.tsx`) — invisible to real visitors, commonly auto-filled by bots. A non-empty value causes the server to return a normal success response without inserting anything, so scripted spam gets no signal to adapt on.

**Known, accepted gap:** `rate_limit_windows` rows are never purged. Each unique IP × bucket × window creates a permanent row. Negligible at current scale; revisit with a periodic cleanup (or `pg_cron`) if the table grows enough to matter.

Extending this pattern to a new public route: pick a bucket name, choose a limit appropriate to abuse risk vs. legitimate retry behavior, and call `checkRateLimit` early in the handler — before any expensive work or DB writes.

---

## 9. Dependencies and Ownership

| Service | Purpose | Source of truth |
|---|---|---|
| GitHub | Repository, branches, history, collaboration | GitHub repository settings |
| Vercel | Builds, deployments, domains, runtime environment variables | Vercel project |
| Supabase | Database, Auth, RLS, user sessions | Supabase project dashboard and SQL migrations |
| Amazon S3/AWS | Artwork and application media | AWS account, IAM, and S3 buckets |
| Textbelt | SMS OTP delivery | Textbelt account/API configuration |
| Supabase email | OTP fallback and auth email | Supabase Auth email settings |
| Resend | Transactional application email where configured | Resend account and Vercel environment variables |
| Domain/DNS provider | Domain registration and DNS | Registrar/DNS account |

Never place live credentials in this document or the repository. Record account ownership and recovery contacts in a secure password manager.

---

## 10. Current Maintenance Priorities

### Weekly

- Review orders, inventory, and failed customer actions
- Confirm new products display correctly
- Check Vercel production deployment status
- Check Supabase Auth and database alerts
- Verify OTP delivery if account changes occurred

### Monthly

- Review Vercel, Supabase, AWS, Textbelt, and Resend usage/billing
- Review admin access
- Check dependency/security alerts in GitHub
- Test sign-in, portal access, checkout/payment instructions, contact email, and image uploads
- Confirm backups and recovery access

### Before every release

- Work in a branch
- Review changed environment variables and migrations
- Test RLS with customer and admin accounts
- Test mobile and desktop layouts
- Verify S3 upload/display behavior
- Deploy a Vercel preview
- Approve production deployment

---

## 11. Explicit Roadmap - Not Current Production

The following are valid ideas but must remain labeled as backlog until approved and implemented:

- `/collections`
- `/process`
- `/sold-archive`
- `/commissions`
- Dedicated `/cart` page
- Legal pages
- `/admin/audit-log`
- `/admin/media`
- `/admin/content`
- Editor role
- Product slugs and SKUs
- Draft/scheduled/archived product states
- Compare-at pricing
- Stripe or another integrated processor — scoped together with tax calculation, see §5
- CloudFront and KMS hardening
- Central Zod validation
- Dedicated service/data-access abstraction layers

Each roadmap item requires repository review, schema design, RLS policies, tests, rollout steps, and owner documentation.

---

## 12. Claude Operating Directive

> Treat this document as the current-state source of truth for TheRack.
>
> Inspect the repository before proposing changes. Preserve Next.js, Supabase Postgres, `supabase-js`, Supabase Auth, RLS, the `/portal` route, `/shop/[id]`, the `customer | admin` role model, the direct S3 implementation, the Textbelt/Supabase OTP system, and the DB-backed rate-limiting pattern (`rate_limit_windows` / `lib/rate-limit.ts`).
>
> Do not add Prisma, Cognito, Auth.js, Stripe, CloudFront, KMS, product slugs, an Editor role, a third-party rate-limiting/CAPTCHA service, or replacement route conventions unless the task explicitly authorizes that change.
>
> Separate every recommendation into one of three categories:
>
> 1. Confirmed current implementation
> 2. Safe incremental improvement
> 3. Future migration or backlog item
>
> Before coding, identify the affected routes, tables, RLS policies, environment variables, external services, and regression risks. Keep the live application runnable and deploy changes through a Vercel preview before production.
