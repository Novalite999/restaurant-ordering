import { getCategories } from "@/lib/data";
import { PageHeader } from "@/components/admin/ui";
import { CategoryManager } from "@/components/admin/categories";

export const dynamic = "force-dynamic";
export const metadata = { title: "Categories" };

export default async function CategoriesPage() {
  const categories = await getCategories();
  return (
    <>
      <PageHeader title="Categories" subtitle="The order here is the order customers see on the menu." />
      <div className="max-w-2xl px-4 lg:px-8">
        <CategoryManager categories={categories} />
      </div>
    </>
  );
}
