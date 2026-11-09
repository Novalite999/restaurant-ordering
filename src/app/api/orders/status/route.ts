import { NextResponse } from "next/server";
import { query } from "@/lib/db";

// Public status lookup for the customer's own orders (ids are unguessable UUIDs).
export async function GET(req: Request) {
  const ids = (new URL(req.url).searchParams.get("ids") ?? "")
    .split(",")
    .filter((s) => /^[0-9a-f-]{36}$/i.test(s))
    .slice(0, 30);
  if (ids.length === 0) return NextResponse.json({ orders: [] });
  const orders = await query(
    `SELECT o.id, o.order_number, o.status, o.payment_status, o.fulfillment_type, o.total_cents, o.created_at,
            (SELECT coalesce(sum(quantity),0)::int FROM order_items WHERE order_id = o.id) AS item_count,
            (SELECT string_agg(quantity || '× ' || name, ', ' ORDER BY id) FROM order_items WHERE order_id = o.id) AS summary
       FROM orders o WHERE o.id = ANY($1::uuid[]) ORDER BY o.created_at DESC`,
    [ids]
  );
  return NextResponse.json({ orders }, { headers: { "Cache-Control": "no-store" } });
}
