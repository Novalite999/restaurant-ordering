import { CartPage } from "@/components/store/cart-page";
import { getPublicMenu, getSettings } from "@/lib/data";

export const dynamic = "force-dynamic";
export const metadata = { title: "Cart" };

export default async function Page() {
  const [settings, menu] = await Promise.all([getSettings(), getPublicMenu()]);
  return <CartPage items={menu.items} settings={settings} />;
}
