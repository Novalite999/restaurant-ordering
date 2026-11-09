import { NextResponse } from "next/server";
import { z } from "zod";
import { CheckoutError, createCheckout } from "@/lib/orders";

const schema = z
  .object({
    items: z.array(z.object({ id: z.number().int().positive(), quantity: z.number().int().min(1).max(50) })).min(1).max(60),
    fulfillment_type: z.enum(["pickup", "delivery"]),
    customer_name: z.string().trim().min(2, "Enter your name").max(80),
    customer_email: z.string().trim().email("Enter a valid email"),
    customer_phone: z
      .string()
      .trim()
      .refine((v) => v.replace(/\D/g, "").length >= 10, "Enter a 10-digit phone number"),
    address_line1: z.string().trim().max(120).optional(),
    address_line2: z.string().trim().max(120).optional(),
    city: z.string().trim().max(60).optional(),
    state: z.string().trim().max(2).optional(),
    zip: z.string().trim().max(10).optional(),
    notes: z.string().trim().max(500).optional(),
    tip_percent: z.number().int().min(0).max(25).default(0),
  })
  .superRefine((v, ctx) => {
    if (v.fulfillment_type !== "delivery") return;
    if (!v.address_line1 || v.address_line1.length < 3) ctx.addIssue({ code: "custom", path: ["address_line1"], message: "Enter a street address" });
    if (!v.city) ctx.addIssue({ code: "custom", path: ["city"], message: "Enter a city" });
    if (!v.state || !/^[A-Za-z]{2}$/.test(v.state)) ctx.addIssue({ code: "custom", path: ["state"], message: "Use a 2-letter state" });
    if (!v.zip || !/^\d{5}(-\d{4})?$/.test(v.zip)) ctx.addIssue({ code: "custom", path: ["zip"], message: "Enter a 5-digit ZIP" });
  });

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return NextResponse.json({ error: "Please check the highlighted fields.", fieldErrors }, { status: 422 });
  }
  try {
    const d = parsed.data;
    const res = await createCheckout({ ...d, state: d.state?.toUpperCase() });
    return NextResponse.json(res);
  } catch (e) {
    if (e instanceof CheckoutError) return NextResponse.json({ error: e.message, itemId: e.itemId }, { status: 409 });
    console.error(e);
    return NextResponse.json({ error: "Something went wrong placing your order. Please try again." }, { status: 500 });
  }
}
