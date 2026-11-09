import { requireOwner } from "@/lib/auth";
import { getSettings } from "@/lib/data";
import { stripeMode } from "@/lib/stripe";
import { PageHeader, Panel } from "@/components/admin/ui";
import { SettingsForm } from "@/components/admin/forms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireOwner();
  const s = await getSettings();
  const mode = stripeMode();
  return (
    <>
      <PageHeader title="Settings" />
      <div className="space-y-4 px-4 lg:px-8">
        <SettingsForm s={s} />
        <Panel title="Payments">
          <div className="space-y-2 p-4 text-sm sm:p-5">
            <p>
              Stripe:{" "}
              <strong className={mode === "live" ? "text-basil" : mode === "test" ? "text-ink" : "text-chili"}>
                {mode === "live" ? "Live, taking real payments" : mode === "test" ? "Test mode" : "Not connected"}
              </strong>
            </p>
            <p className="text-muted">
              Keys are set as environment variables in Vercel (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET) so they never sit in the database.
              The webhook endpoint is <code className="rounded bg-mist px-1.5 py-0.5">/api/stripe/webhook</code>.
            </p>
            <p>
              Webhook: <strong>{process.env.STRIPE_WEBHOOK_SECRET ? "Connected" : "Not set"}</strong>
            </p>
          </div>
        </Panel>
      </div>
    </>
  );
}
