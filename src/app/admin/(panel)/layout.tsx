import { AdminShell } from "@/components/admin/shell";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/data";
import { queryOne } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: { default: "Admin", template: "%s · Admin" }, robots: { index: false } };

export default async function PanelLayout({ children }: LayoutProps<"/admin">) {
  const [admin, settings, counts] = await Promise.all([
    requireAdmin(),
    getSettings(),
    queryOne<{ n: number }>(`SELECT count(*)::int AS n FROM orders WHERE status IN ('new','preparing','ready','out_for_delivery')`),
  ]);
  return (
    <AdminShell user={admin} storeName={settings.restaurant_name} isOpen={settings.is_open} activeCount={counts?.n ?? 0}>
      {children}
    </AdminShell>
  );
}
