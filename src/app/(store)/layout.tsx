import { CartProvider } from "@/components/store/cart";
import { BottomNav, StoreTopBar } from "@/components/store/shell";
import { getSettings } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function StoreLayout({ children }: LayoutProps<"/">) {
  const settings = await getSettings();
  return (
    <CartProvider>
      <StoreTopBar name={settings.restaurant_name} isOpen={settings.is_open} />
      <div className="pb-24 lg:pb-12">{children}</div>
      <BottomNav />
    </CartProvider>
  );
}
