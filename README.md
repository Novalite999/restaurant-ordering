# Restaurant online ordering

A mobile-first ordering app for a US restaurant, with a staff dashboard to run the kitchen, menu, stock and payments.

Built with Next.js 16 (App Router), Neon Postgres, Stripe Checkout and Tailwind CSS 4. Deploys to Vercel.

## What customers get

- App-style menu on phones (bottom tabs, sticky category bar, bottom-sheet item details, floating cart bar) and a two-column layout with a live cart on desktop
- Live stock: "Only 3 left" badges, sold-out items greyed out, carts re-checked against stock on every visit
- Regular and discount prices with "Save N%" labels
- Pickup or delivery, saved contact details, tip options, sales tax and delivery fee shown before paying
- Secure card / Apple Pay / Google Pay payment on Stripe Checkout
- Order page that updates itself as the kitchen moves the order along, plus "My orders" history on the device
- Installable as a home-screen app (web manifest)

## What staff get (`/admin`)

- **Overview**: today's sales, orders in the kitchen, 14-day sales chart, best sellers, low-stock alerts
- **Orders**: kitchen ticket board (New, Preparing, Ready) that refreshes every 10 seconds and chimes on new orders; full order history with search; per-order timeline, print ticket, refunds and cancellations (with optional restock)
- **Menu**: add, edit, delete items; regular and discount price; mark in / out of stock in one tap; +/- stock or type an exact count; photos (upload or link); featured items; tags
- **Inventory**: stock levels, 7-day sales per item, quick restock, and a full audit log of every stock change (who, when, why, which order)
- **Payments**: net sales, refunds, tax and tips collected, every transaction with card and Stripe link
- **Categories**, **Settings** (open/closed, pickup/delivery, tax rate, delivery fee, minimum order, prep time), **Team** (owner/staff accounts)

## How stock stays correct

1. At checkout the server re-prices everything from the database and reserves stock inside a database transaction (`UPDATE ... WHERE stock_quantity >= qty`), so two people can't buy the last item.
2. Paying (Stripe webhook `checkout.session.completed`, or the confirmation page as a backup) marks the order paid and sends it to the kitchen.
3. If the customer abandons or the 30-minute Stripe session expires, the stock is returned automatically (webhook `checkout.session.expired`, the cancel page, and a safety sweep).
4. Every change is written to `inventory_logs`.

## Setup

1. Create the database schema: run `db/schema.sql` (and optionally `db/seed.sql` for a demo menu) in the Neon SQL editor.
2. Copy `.env.example` to `.env.local` and fill it in.
3. Create the first owner account (replace the email and hash):
   ```sql
   INSERT INTO admin_users (email, name, password_hash, role)
   VALUES ('you@example.com', 'Owner', '<bcrypt hash>', 'owner');
   ```
   Generate a hash with `node -e "console.log(require('bcryptjs').hashSync('your-password', 11))"`.
4. `npm install && npm run dev`

### Stripe

1. Add `STRIPE_SECRET_KEY` in Vercel (Project → Settings → Environment Variables).
2. In Stripe → Developers → Webhooks, add an endpoint `https://YOUR-DOMAIN/api/stripe/webhook` with these events:
   `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `charge.refunded`.
3. Copy the signing secret into `STRIPE_WEBHOOK_SECRET` and redeploy.

Test card: `4242 4242 4242 4242`, any future date, any CVC, any ZIP.

### Photo uploads

Create a Vercel Blob store and connect it to the project; Vercel adds `BLOB_READ_WRITE_TOKEN` and the upload button appears in the item editor.
