import { LoginForm } from "./login-form";
import { getSettings } from "@/lib/data";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sign in", robots: { index: false } };

export default async function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : "/admin";
  const s = await getSettings().catch(() => null);
  return (
    <main className="grid min-h-dvh place-items-center bg-ink px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-3 text-paper">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.svg" alt="" className="size-11 rounded-2xl" />
          <div>
            <p className="font-display text-xl font-bold">{s?.restaurant_name ?? "Restaurant"}</p>
            <p className="text-sm text-paper/60">Staff sign in</p>
          </div>
        </div>
        <LoginForm next={next} />
      </div>
    </main>
  );
}
