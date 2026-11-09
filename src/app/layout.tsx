import type { Metadata, Viewport } from "next";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/instrument-sans";
import { Toaster } from "sonner";
import "./globals.css";

const NAME = process.env.NEXT_PUBLIC_RESTAURANT_NAME || "Saltbox Kitchen";

export const metadata: Metadata = {
  title: { default: `${NAME} — Order online`, template: `%s · ${NAME}` },
  description: "Order pickup or delivery straight from our kitchen.",
  applicationName: NAME,
  appleWebApp: { capable: true, title: NAME, statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#1e6b47",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="antialiased">
      <body className="min-h-dvh">
        {children}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
