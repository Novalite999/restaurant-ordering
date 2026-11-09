import { requireAdmin } from "@/lib/auth";
import { PageHeader, Panel } from "@/components/admin/ui";
import { MoreMenu } from "@/components/admin/shell";
import { ChangePassword } from "@/components/admin/forms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Account" };

export default async function More() {
  const a = await requireAdmin();
  return (
    <>
      <PageHeader title="Account" subtitle={`Signed in as ${a.name} (${a.email})`} />
      <div className="space-y-4 px-4 lg:px-8">
        <div className="lg:hidden">
          <MoreMenu role={a.role} />
        </div>
        <Panel title="Change password">
          <ChangePassword />
        </Panel>
      </div>
    </>
  );
}
