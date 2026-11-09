// Re-mounts on every navigation, so each page fades in instead of snapping.
export default function StoreTemplate({ children }: { children: React.ReactNode }) {
  return <div className="page-in">{children}</div>;
}
