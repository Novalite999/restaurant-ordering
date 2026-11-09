import Link from "next/link";
import { Plus } from "lucide-react";
import { getAdminMenu, getCategories } from "@/lib/data";
import { PageHeader, btn } from "@/components/admin/ui";
import { MenuTable } from "@/components/admin/menu-table";
import { SavedToast } from "@/components/admin/saved-toast";

export const dynamic = "force-dynamic";
export const metadata = { title: "Menu" };

export default async function MenuPage() {
  const [items, categories] = await Promise.all([getAdminMenu(), getCategories()]);
  const out = items.filter((i) => !i.is_available || (i.track_stock && i.stock_quantity === 0)).length;
  return (
    <>
      <SavedToast message="Item saved" />
      <PageHeader
        title="Menu"
        subtitle={`${items.length} items${out ? `, ${out} out of stock` : ""}`}
        actions={
          <Link href="/admin/menu/new" className={btn.green}>
            <Plus className="size-4" /> New item
          </Link>
        }
      />
      <div className="px-4 lg:px-8">
        <MenuTable items={items} categories={categories} />
      </div>
    </>
  );
}
