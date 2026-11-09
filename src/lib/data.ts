import "server-only";
import { query, queryOne } from "./db";
import type { Category, MenuItem, PublicMenuItem, Settings } from "./types";

const SETTINGS_COLS = `restaurant_name, tagline, phone, email, address, is_open, pickup_enabled, delivery_enabled,
  tax_rate_bps, delivery_fee_cents, min_order_cents, prep_time_minutes`;

export async function getSettings(): Promise<Settings> {
  const s = await queryOne<Settings>(`SELECT ${SETTINGS_COLS} FROM settings WHERE id = 1`);
  if (!s) throw new Error("Settings row missing — run db/schema.sql");
  return s;
}

export async function getPublicMenu(): Promise<{ categories: Category[]; items: PublicMenuItem[] }> {
  const [categories, rows] = await Promise.all([
    query<Category>(
      `SELECT c.id, c.name, c.slug, c.sort_order, c.is_active
         FROM categories c
        WHERE c.is_active
          AND EXISTS (SELECT 1 FROM menu_items m WHERE m.category_id = c.id AND m.deleted_at IS NULL)
        ORDER BY c.sort_order, c.name`
    ),
    query<MenuItem>(
      `SELECT m.* FROM menu_items m
         LEFT JOIN categories c ON c.id = m.category_id
        WHERE m.deleted_at IS NULL AND (c.id IS NULL OR c.is_active)
        ORDER BY m.sort_order, m.name`
    ),
  ]);
  const items: PublicMenuItem[] = rows.map((m) => {
    const inStock = m.is_available && (!m.track_stock || m.stock_quantity > 0);
    return {
      id: m.id,
      category_id: m.category_id,
      name: m.name,
      description: m.description,
      image_url: m.image_url,
      price_cents: m.price_cents,
      discount_price_cents: m.discount_price_cents,
      in_stock: inStock,
      remaining: inStock && m.track_stock && m.stock_quantity <= m.low_stock_threshold ? m.stock_quantity : null,
      is_featured: m.is_featured,
      tags: m.tags ?? [],
      calories: m.calories,
    };
  });
  return { categories, items };
}

export async function getAdminMenu(): Promise<MenuItem[]> {
  return query<MenuItem>(
    `SELECT m.*, c.name AS category_name
       FROM menu_items m LEFT JOIN categories c ON c.id = m.category_id
      WHERE m.deleted_at IS NULL
      ORDER BY c.sort_order NULLS LAST, m.sort_order, m.name`
  );
}

export async function getMenuItem(id: number): Promise<MenuItem | null> {
  return queryOne<MenuItem>(`SELECT * FROM menu_items WHERE id = $1 AND deleted_at IS NULL`, [id]);
}

export async function getCategories(): Promise<Category[]> {
  return query<Category>(
    `SELECT c.*, (SELECT count(*)::int FROM menu_items m WHERE m.category_id = c.id AND m.deleted_at IS NULL) AS item_count
       FROM categories c ORDER BY c.sort_order, c.name`
  );
}
