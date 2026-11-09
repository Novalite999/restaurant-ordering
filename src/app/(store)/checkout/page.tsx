import { Suspense } from "react";
import { CheckoutForm } from "@/components/store/checkout-form";
import { getPublicMenu, getSettings } from "@/lib/data";
import { getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const metadata = { title: "Checkout" };

export default async function Page() {
  const [settings, menu] = await Promise.all([getSettings(), getPublicMenu()]);
  return (
    <Suspense>
      <CheckoutForm settings={settings} items={menu.items} paymentsReady={!!getStripe()} />
    </Suspense>
  );
}
