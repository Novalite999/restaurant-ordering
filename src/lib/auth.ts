import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { queryOne } from "./db";
import { SESSION_COOKIE, verifySession, type SessionPayload } from "./session";

/** Data-access-layer check: verifies the cookie AND that the account is still active. */
export async function getAdmin(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const s = await verifySession(token);
  if (!s) return null;
  const u = await queryOne<{ id: number; role: "owner" | "staff"; name: string; email: string }>(
    `SELECT id, role, name, email FROM admin_users WHERE id = $1 AND is_active`,
    [s.uid]
  );
  if (!u) return null;
  return { uid: u.id, role: u.role, name: u.name, email: u.email };
}

export async function requireAdmin(): Promise<SessionPayload> {
  const a = await getAdmin();
  if (!a) redirect("/admin/login");
  return a;
}

export async function requireOwner(): Promise<SessionPayload> {
  const a = await requireAdmin();
  if (a.role !== "owner") redirect("/admin");
  return a;
}
