import { MenuView } from "@/components/store/menu-view";
import { getPublicMenu, getSettings } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [settings, menu] = await Promise.all([getSettings(), getPublicMenu()]);
  return <MenuView settings={settings} categories={menu.categories} items={menu.items} />;
}
