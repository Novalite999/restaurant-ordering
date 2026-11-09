import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/auth";
import { queryOne } from "@/lib/db";

export async function GET() {
  if (!(await getAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const row = await queryOne<{ new_count: number; active_count: number; latest: string | null; latest_number: string | null }>(
    `SELECT count(*) FILTER (WHERE status = 'new')::int AS new_count,
            count(*) FILTER (WHERE status IN ('new','preparing','ready','out_for_delivery'))::int AS active_count,
            max(paid_at) AS latest,
            (SELECT order_number FROM orders WHERE paid_at IS NOT NULL ORDER BY paid_at DESC LIMIT 1) AS latest_number
       FROM orders`
  );
  return NextResponse.json(row, { headers: { "Cache-Control": "no-store" } });
}
