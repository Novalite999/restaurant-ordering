import { getCategories } from "@/lib/data";
import { PageHeader } from "@/components/admin/ui";
import { ItemForm } from "@/components/admin/item-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "New item" };

export default async function NewItem() {
  const categories = await getCategories();
  return (
    <>
      <PageHeader title="New menu item" />
      <ItemForm categories={categories} uploads={!!process.env.BLOB_READ_WRITE_TOKEN} />
    </>
  );
}
