import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  const name = process.env.NEXT_PUBLIC_RESTAURANT_NAME || "Saltbox Kitchen";
  return {
    name,
    short_name: name,
    description: "Order pickup or delivery",
    start_url: "/",
    display: "standalone",
    background_color: "#f2f4f1",
    theme_color: "#1e6b47",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
