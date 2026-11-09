import { requireOwner } from "@/lib/auth";
import { query } from "@/lib/db";
import type { AdminUser } from "@/lib/types";
import { PageHeader, Panel } from "@/components/admin/ui";
import { AddMember, MemberRow } from "@/components/admin/forms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Team" };

export default async function TeamPage() {
  const me = await requireOwner();
  const members = await query<AdminUser>(
    `SELECT id, email, name, role, is_active, last_login_at, created_at FROM admin_users ORDER BY is_active DESC, role, name`
  );
  return (
    <>
      <PageHeader title="Team" subtitle="Staff can run orders, menu and stock. Owners can also change settings and the team." />
      <div className="space-y-4 px-4 lg:px-8">
        <Panel title="People with access">
          <ul className="divide-y divide-line">
            {members.map((m) => (
              <MemberRow key={m.id} m={m} me={me.uid} />
            ))}
          </ul>
        </Panel>
        <Panel title="Add someone">
          <AddMember />
        </Panel>
      </div>
    </>
  );
}
