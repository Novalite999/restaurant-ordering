-- Demo menu so the store isn't empty on day one. Safe to edit or delete from the admin panel.
INSERT INTO categories (name, slug, sort_order) VALUES
  ('Burgers', 'burgers', 1),
  ('Chicken & Mains', 'chicken-mains', 2),
  ('Bowls & Salads', 'bowls-salads', 3),
  ('Sides', 'sides', 4),
  ('Desserts', 'desserts', 5),
  ('Drinks', 'drinks', 6)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO menu_items (category_id, name, description, image_url, price_cents, discount_price_cents, stock_quantity, low_stock_threshold, is_featured, tags, calories, sort_order)
SELECT c.id, v.name, v.description, v.image_url, v.price, v.discount, v.stock, 5, v.featured, v.tags::text[], v.cal, v.sort
FROM (VALUES
  ('burgers', 'Double Smash Burger', 'Two crisp-edged beef patties, American cheese, pickles, shaved onion and house sauce on a toasted potato bun.', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=80', 1399, NULL::int, 40, true, '{popular}', 980, 1),
  ('burgers', 'Bacon Cheddar Burger', 'Half-pound patty, sharp cheddar, applewood bacon, lettuce, tomato and smoky mayo.', 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=900&q=80', 1549, 1299, 25, true, '{}', 1120, 2),
  ('burgers', 'Garden Burger', 'Black bean and roasted corn patty, avocado, pepper jack and chipotle crema.', 'https://images.unsplash.com/photo-1520072959219-c595dc870360?auto=format&fit=crop&w=900&q=80', 1249, NULL, 15, false, '{vegetarian}', 720, 3),
  ('chicken-mains', 'Nashville Hot Chicken Sandwich', 'Buttermilk-fried thigh tossed in cayenne oil, slaw and pickles on brioche.', 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?auto=format&fit=crop&w=900&q=80', 1399, NULL, 30, true, '{spicy,popular}', 890, 1),
  ('chicken-mains', 'Crispy Chicken Tenders', 'Five hand-breaded tenders with honey mustard and ranch.', 'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=900&q=80', 1199, NULL, 35, false, '{}', 760, 2),
  ('chicken-mains', 'BBQ Pulled Pork Plate', 'Twelve-hour smoked pork shoulder, tangy BBQ sauce, cornbread and pickled onions.', 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?auto=format&fit=crop&w=900&q=80', 1699, 1499, 12, false, '{}', 1040, 3),
  ('bowls-salads', 'Harvest Grain Bowl', 'Farro, roasted sweet potato, kale, chickpeas, feta and lemon-tahini dressing.', 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=80', 1349, NULL, 20, false, '{vegetarian}', 610, 1),
  ('bowls-salads', 'Grilled Chicken Cobb', 'Romaine, grilled chicken, bacon, egg, avocado, tomato and blue cheese.', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=900&q=80', 1449, NULL, 18, false, '{gluten-free}', 680, 2),
  ('sides', 'Seasoned Fries', 'Skin-on fries with our garlic-paprika salt.', 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=900&q=80', 499, NULL, 80, false, '{vegan}', 420, 1),
  ('sides', 'Mac & Cheese', 'Three-cheese sauce, cavatappi and a buttery cracker crust.', 'https://images.unsplash.com/photo-1543339494-b4cd4f7ba686?auto=format&fit=crop&w=900&q=80', 649, NULL, 30, false, '{vegetarian}', 540, 2),
  ('sides', 'Onion Rings', 'Beer-battered sweet onion rings with chipotle ketchup.', 'https://images.unsplash.com/photo-1639024471283-03518883512d?auto=format&fit=crop&w=900&q=80', 599, NULL, 4, false, '{}', 480, 3),
  ('desserts', 'Brown Butter Cookie', 'Chewy chocolate chunk cookie finished with flaky salt.', 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=900&q=80', 349, NULL, 24, false, '{vegetarian}', 380, 1),
  ('desserts', 'Classic Vanilla Shake', 'Hand-spun vanilla bean ice cream and whole milk.', 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=900&q=80', 699, 549, 20, true, '{new}', 640, 2),
  ('drinks', 'Fresh Lemonade', 'Squeezed in-house every morning.', 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?auto=format&fit=crop&w=900&q=80', 399, NULL, 50, false, '{vegan}', 150, 1),
  ('drinks', 'Sweet Iced Tea', 'Southern-style black tea, lightly sweetened.', 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=900&q=80', 329, NULL, 60, false, '{vegan}', 120, 2),
  ('drinks', 'Bottled Water', 'Still spring water, 16.9 oz.', NULL, 199, NULL, 0, false, '{}', 0, 3)
) AS v(cat, name, description, image_url, price, discount, stock, featured, tags, cal, sort)
JOIN categories c ON c.slug = v.cat
WHERE NOT EXISTS (SELECT 1 FROM menu_items);

-- Bottled water: unlimited stock example
UPDATE menu_items SET track_stock = false WHERE name = 'Bottled Water';

INSERT INTO inventory_logs (menu_item_id, change, stock_after, reason, note)
SELECT id, stock_quantity, stock_quantity, 'initial', 'Opening stock'
FROM menu_items WHERE track_stock AND NOT EXISTS (SELECT 1 FROM inventory_logs);
