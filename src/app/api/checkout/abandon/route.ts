import { NextResponse } from "next/server";
import { abandonCheckout } from "@/lib/orders";

export async function POST(req: Request) {
  const { orderId } = (await req.json().catch(() => ({}))) as { orderId?: string };
  if (!orderId || !/^[0-9a-f-]{36}$/i.test(orderId)) return NextResponse.json({ ok: false }, { status: 400 });
  await abandonCheckout(orderId).catch((e) => console.error(e));
  return NextResponse.json({ ok: true });
}
