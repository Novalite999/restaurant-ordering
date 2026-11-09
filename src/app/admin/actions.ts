"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { put } from "@vercel/blob";
import { query, queryOne, withTransaction } from "@/lib/db";
import { requireAdmin, requireOwner } from "@/lib/auth";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, signSession } from "@/lib/session";
import { dollarsToCents, slugify } from "@/lib/format";
import { cancelOrder, refundOrder, setOrderStatus } from "@/lib/orders";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/types";

export type ActionState = { ok?: boolean; error?: string; message?: string } | null;

// ---------- Auth ----------

export async function login(_: ActionState, fd: FormData): Promise<ActionState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  const next = String(fd.get("next") ?? "/admin");
  const u = await queryOne<{ id: number; name: string; email: string; role: "owner" | "staff"; password_hash: string }>(
    `SELECT id, name, email, role, password_hash FROM admin_users WHERE lower(email) = $1 AND is_active`,
    [email]
  );
  // Constant-ish time: always run a compare.
  const ok = await bcrypt.compare(password, u?.password_hash ?? "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv");
  if (!u || !ok) return { error: "That email and password don't match an account." };
  const token = await signSession({ uid: u.id, role: u.role, name: u.name, email: u.email });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  await query(`UPDATE admin_users SET last_login_at = now() WHERE id = $1`, [u.id]);
  redirect(next.startsWith("/admin") ? next : "/admin");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/admin/login");
}

// ---------- Orders ----------

export async function advanceOrder(orderId: string, status: OrderStatus): Promise<ActionState> {
  const a = await requireAdmin();
  if (!ORDER_STATUSES.includes(status)) return { error: "Unknown status" };
  try {
    await setOrderStatus(orderId, status, a.name);
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath("/admin", "layout");
  return { ok: true };
}

export async function cancelOrderAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const a = await requireAdmin();
  const id = String(fd.get("orderId"));
  try {
    await cancelOrder(
      id,
      { refund: fd.get("refund") === "on", restock: fd.get("restock") === "on", reason: String(fd.get("reason") ?? "").slice(0, 200) },
      a.name
    );
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Order cancelled" };
}

export async function refundAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const a = await requireAdmin();
  const id = String(fd.get("orderId"));
  const amount = dollarsToCents(fd.get("amount"));
  if (amount !== null && (Number.isNaN(amount) || amount <= 0)) return { error: "Enter a valid amount" };
  try {
    await refundOrder(id, amount, a.name);
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Refund issued" };
}

// ---------- Menu items ----------

async function uploadImage(file: File | null): Promise<string | null> {
  if (!file || file.size === 0) return null;
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error("Image uploads aren't configured. Paste an image URL instead.");
  if (!file.type.startsWith("image/")) throw new Error("Upload a JPG, PNG or WebP image.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Images must be under 5 MB.");
  const blob = await put(`menu/${Date.now()}-${slugify(file.name.replace(/\.[^.]+$/, ""))}`, file, {
    access: "public",
    contentType: file.type,
    addRandomSuffix: true,
  });
  return blob.url;
}

export async function saveMenuItem(_: ActionState, fd: FormData): Promise<ActionState> {
  const a = await requireAdmin();
  const id = fd.get("id") ? Number(fd.get("id")) : null;
  const name = String(fd.get("name") ?? "").trim();
  const description = String(fd.get("description") ?? "").trim().slice(0, 600);
  const category_id = fd.get("category_id") ? Number(fd.get("category_id")) : null;
  const price = dollarsToCents(fd.get("price"));
  const discount = dollarsToCents(fd.get("discount_price"));
  const track_stock = fd.get("track_stock") === "on";
  const stock = Number(fd.get("stock_quantity") ?? 0);
  const low = Number(fd.get("low_stock_threshold") ?? 5);
  const is_available = fd.get("is_available") === "on";
  const is_featured = fd.get("is_featured") === "on";
  const calories = fd.get("calories") ? Number(fd.get("calories")) : null;
  const tags = String(fd.get("tags") ?? "")
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 6);

  if (name.length < 2) return { error: "Give the item a name." };
  if (price == null || Number.isNaN(price) || price <= 0) return { error: "Enter a regular price greater than $0." };
  if (discount != null && (Number.isNaN(discount) || discount >= price))
    return { error: "The discount price must be lower than the regular price (or left empty)." };
  if (!Number.isInteger(stock) || stock < 0) return { error: "Stock must be a whole number, 0 or more." };

  let image_url = String(fd.get("image_url") ?? "").trim() || null;
  try {
    const uploaded = await uploadImage(fd.get("image_file") as File | null);
    if (uploaded) image_url = uploaded;
  } catch (e) {
    return { error: (e as Error).message };
  }

  await withTransaction(async (tx) => {
    if (id) {
      const [prev] = await tx.query<{ stock_quantity: number }>(`SELECT stock_quantity FROM menu_items WHERE id = $1 FOR UPDATE`, [id]);
      await tx.query(
        `UPDATE menu_items SET name=$2, description=$3, category_id=$4, price_cents=$5, discount_price_cents=$6,
           track_stock=$7, stock_quantity=$8, low_stock_threshold=$9, is_available=$10, is_featured=$11,
           calories=$12, tags=$13, image_url=$14, updated_at=now() WHERE id=$1`,
        [id, name, description, category_id, price, discount, track_stock, stock, low, is_available, is_featured, calories, tags, image_url]
      );
      if (prev && track_stock && prev.stock_quantity !== stock) {
        await tx.query(
          `INSERT INTO inventory_logs (menu_item_id, change, stock_after, reason, note, actor) VALUES ($1,$2,$3,'adjustment','Edited on item page',$4)`,
          [id, stock - prev.stock_quantity, stock, a.name]
        );
      }
    } else {
      const [row] = await tx.query<{ id: number }>(
        `INSERT INTO menu_items (name, description, category_id, price_cents, discount_price_cents, track_stock, stock_quantity,
           low_stock_threshold, is_available, is_featured, calories, tags, image_url,
           sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,
           (SELECT coalesce(max(sort_order),0)+1 FROM menu_items)) RETURNING id`,
        [name, description, category_id, price, discount, track_stock, stock, low, is_available, is_featured, calories, tags, image_url]
      );
      if (track_stock)
        await tx.query(
          `INSERT INTO inventory_logs (menu_item_id, change, stock_after, reason, note, actor) VALUES ($1,$2,$2,'initial','Item created',$3)`,
          [row.id, stock, a.name]
        );
    }
  });
  revalidatePath("/", "layout");
  redirect("/admin/menu?saved=1");
}

export async function deleteMenuItem(id: number): Promise<ActionState> {
  await requireAdmin();
  await query(`UPDATE menu_items SET deleted_at = now(), is_featured = false WHERE id = $1`, [id]);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function toggleAvailability(id: number, available: boolean): Promise<ActionState> {
  await requireAdmin();
  await query(`UPDATE menu_items SET is_available = $2, updated_at = now() WHERE id = $1`, [id, available]);
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Add or remove stock (delta) or set an exact count (set). Logged for the audit trail. */
export async function adjustStock(
  id: number,
  opts: { delta?: number; set?: number; note?: string }
): Promise<ActionState & { stock?: number }> {
  const a = await requireAdmin();
  try {
    const result = await withTransaction(async (tx) => {
      const [cur] = await tx.query<{ stock_quantity: number }>(`SELECT stock_quantity FROM menu_items WHERE id = $1 FOR UPDATE`, [id]);
      if (!cur) throw new Error("Item not found");
      const next = opts.set != null ? opts.set : cur.stock_quantity + (opts.delta ?? 0);
      if (!Number.isInteger(next) || next < 0) throw new Error("Stock can't go below zero");
      const change = next - cur.stock_quantity;
      if (change === 0) return next;
      await tx.query(`UPDATE menu_items SET stock_quantity = $2, track_stock = true, updated_at = now() WHERE id = $1`, [id, next]);
      await tx.query(
        `INSERT INTO inventory_logs (menu_item_id, change, stock_after, reason, note, actor) VALUES ($1,$2,$3,$4,$5,$6)`,
        [id, change, next, change > 0 ? "restock" : "adjustment", opts.note || null, a.name]
      );
      return next;
    });
    revalidatePath("/", "layout");
    return { ok: true, stock: result };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// ---------- Categories ----------

export async function saveCategory(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = fd.get("id") ? Number(fd.get("id")) : null;
  const name = String(fd.get("name") ?? "").trim();
  if (name.length < 2) return { error: "Category name is too short." };
  const slug = slugify(name) || `cat-${Date.now()}`;
  try {
    if (id) {
      await query(`UPDATE categories SET name=$2, slug=$3 WHERE id=$1`, [id, name, `${slug}-${id}`]);
    } else {
      await query(
        `INSERT INTO categories (name, slug, sort_order) VALUES ($1, $2 || '-' || substr(md5(random()::text),1,4),
           (SELECT coalesce(max(sort_order),0)+1 FROM categories))`,
        [name, slug]
      );
    }
  } catch {
    return { error: "Couldn't save the category. Try a different name." };
  }
  revalidatePath("/", "layout");
  return { ok: true, message: id ? "Category renamed" : "Category added" };
}

export async function moveCategory(id: number, dir: -1 | 1): Promise<ActionState> {
  await requireAdmin();
  const rows = await query<{ id: number }>(`SELECT id FROM categories ORDER BY sort_order, name`);
  const i = rows.findIndex((r) => r.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= rows.length) return { ok: true };
  [rows[i], rows[j]] = [rows[j], rows[i]];
  await withTransaction(async (tx) => {
    for (let k = 0; k < rows.length; k++) await tx.query(`UPDATE categories SET sort_order = $2 WHERE id = $1`, [rows[k].id, k]);
  });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function toggleCategory(id: number, active: boolean): Promise<ActionState> {
  await requireAdmin();
  await query(`UPDATE categories SET is_active = $2 WHERE id = $1`, [id, active]);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteCategory(id: number): Promise<ActionState> {
  await requireAdmin();
  const c = await queryOne<{ n: number }>(`SELECT count(*)::int AS n FROM menu_items WHERE category_id = $1 AND deleted_at IS NULL`, [id]);
  if (c && c.n > 0) return { error: "Move or delete the items in this category first." };
  await query(`DELETE FROM categories WHERE id = $1`, [id]);
  revalidatePath("/", "layout");
  return { ok: true };
}

// ---------- Settings ----------

export async function saveSettings(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireOwner();
  const s = (k: string) => String(fd.get(k) ?? "").trim();
  const tax = Number(s("tax_rate"));
  const fee = dollarsToCents(fd.get("delivery_fee"));
  const min = dollarsToCents(fd.get("min_order"));
  const prep = Number(s("prep_time_minutes"));
  if (!s("restaurant_name")) return { error: "Restaurant name is required." };
  if (!Number.isFinite(tax) || tax < 0 || tax > 20) return { error: "Sales tax must be between 0% and 20%." };
  if (fee == null || Number.isNaN(fee) || min == null || Number.isNaN(min)) return { error: "Check the delivery fee and minimum order." };
  if (min < 50) return { error: "Stripe needs a minimum order of at least $0.50." };
  if (!Number.isInteger(prep) || prep < 1 || prep > 240) return { error: "Prep time should be 1–240 minutes." };
  await query(
    `UPDATE settings SET restaurant_name=$1, tagline=$2, phone=$3, email=$4, address=$5, is_open=$6, pickup_enabled=$7,
       delivery_enabled=$8, tax_rate_bps=$9, delivery_fee_cents=$10, min_order_cents=$11, prep_time_minutes=$12, updated_at=now()
     WHERE id = 1`,
    [
      s("restaurant_name"), s("tagline"), s("phone"), s("email"), s("address"), fd.get("is_open") === "on",
      fd.get("pickup_enabled") === "on", fd.get("delivery_enabled") === "on", Math.round(tax * 100), fee, min, prep,
    ]
  );
  revalidatePath("/", "layout");
  return { ok: true, message: "Settings saved" };
}

export async function setStoreOpen(open: boolean): Promise<ActionState> {
  await requireAdmin();
  await query(`UPDATE settings SET is_open = $1, updated_at = now() WHERE id = 1`, [open]);
  revalidatePath("/", "layout");
  return { ok: true };
}

// ---------- Team ----------

export async function addTeamMember(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireOwner();
  const name = String(fd.get("name") ?? "").trim();
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  const role = fd.get("role") === "owner" ? "owner" : "staff";
  if (name.length < 2) return { error: "Enter a name." };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Enter a valid email." };
  if (password.length < 10) return { error: "Passwords need at least 10 characters." };
  const hash = await bcrypt.hash(password, 11);
  try {
    await query(`INSERT INTO admin_users (name, email, password_hash, role) VALUES ($1,$2,$3,$4)`, [name, email, hash, role]);
  } catch {
    return { error: "Someone already uses that email." };
  }
  revalidatePath("/admin/team");
  return { ok: true, message: `${name} can now sign in` };
}

export async function setMemberActive(id: number, active: boolean): Promise<ActionState> {
  const me = await requireOwner();
  if (id === me.uid) return { error: "You can't deactivate yourself." };
  await query(`UPDATE admin_users SET is_active = $2 WHERE id = $1`, [id, active]);
  revalidatePath("/admin/team");
  return { ok: true };
}

export async function changePassword(_: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireAdmin();
  const current = String(fd.get("current") ?? "");
  const next = String(fd.get("next") ?? "");
  if (next.length < 10) return { error: "New password needs at least 10 characters." };
  const u = await queryOne<{ password_hash: string }>(`SELECT password_hash FROM admin_users WHERE id = $1`, [me.uid]);
  if (!u || !(await bcrypt.compare(current, u.password_hash))) return { error: "Current password is wrong." };
  await query(`UPDATE admin_users SET password_hash = $2 WHERE id = $1`, [me.uid, await bcrypt.hash(next, 11)]);
  return { ok: true, message: "Password updated" };
}
