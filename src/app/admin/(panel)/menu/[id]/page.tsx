import { notFound } from "next/navigation";
import { getCategories, getMenuItem } from "@/lib/data";
import { PageHeader } from "@/components/admin/ui";
import { ItemForm } from "@/components/admin/item-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit item" };

export default async function EditItem({ params }: PageProps<"/admin/menu/[id]">) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const [item, categories] = await Promise.all([getMenuItem(id), getCategories()]);
  if (!item) notFound();
  return (
    <>
      <PageHeader title={`Edit ${item.name}`} />
      <ItemForm item={item} categories={categories} uploads={!!process.env.BLOB_READ_WRITE_TOKEN} />
    </>
  );
}
