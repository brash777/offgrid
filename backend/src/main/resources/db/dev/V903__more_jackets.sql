INSERT INTO products (category_id, name, description, base_price, slot)
SELECT c.id, p.name, p.description, p.base_price, p.slot
FROM (VALUES
    ('The North Face 1996 Retro Nuptse', 'La chaqueta de plumón más reconocida de la calle: brillante, voluminosa y con capucha guardable.', 1499900.00, 'TORSO', 'chaquetas'),
    ('Arc''teryx Beta LT', 'Shell GORE-TEX liviano y técnico, con capucha ajustable. El favorito del gorpcore.', 2199900.00, 'TORSO', 'chaquetas'),
    ('Supreme × The North Face Mountain Jacket', 'Colaboración Supreme y The North Face: nylon impermeable con logos bordados.', 2599900.00, 'TORSO', 'chaquetas')
) AS p (name, description, base_price, slot, category_slug)
JOIN categories c ON c.slug = p.category_slug;

INSERT INTO product_variants (product_id, size, color_name, color_hex, sku)
SELECT pr.id, s.size, 'Negro', '#141414', j.product_code || '-NEG-' || s.size
FROM (VALUES
    ('The North Face 1996 Retro Nuptse', 'DR-TNFNP'),
    ('Arc''teryx Beta LT', 'DR-ARCBL'),
    ('Supreme × The North Face Mountain Jacket', 'DR-SUPTM')
) AS j (product_name, product_code)
CROSS JOIN (VALUES ('S'), ('M'), ('L'), ('XL')) AS s (size)
JOIN products pr ON pr.name = j.product_name AND pr.is_active;

INSERT INTO stock_movements (product_variant_id, quantity_delta, reason)
SELECT pv.id, CASE WHEN pv.sku = 'DR-SUPTM-NEG-M' THEN 2 ELSE 8 END, 'RESTOCK'
FROM product_variants pv
WHERE pv.sku LIKE 'DR-TNFNP-%' OR pv.sku LIKE 'DR-ARCBL-%' OR pv.sku LIKE 'DR-SUPTM-%';

INSERT INTO product_images (product_id, variant_id, path, position)
SELECT pr.id,
       (SELECT pv.id FROM product_variants pv WHERE pv.product_id = pr.id ORDER BY pv.size LIMIT 1),
       i.path,
       0
FROM (VALUES
    ('The North Face 1996 Retro Nuptse', 'product-images/drip-tnf-nuptse-black.webp'),
    ('Arc''teryx Beta LT', 'product-images/drip-arcteryx-beta-lt.webp'),
    ('Supreme × The North Face Mountain Jacket', 'product-images/drip-supreme-tnf-mountain.webp')
) AS i (product_name, path)
JOIN products pr ON pr.name = i.product_name AND pr.is_active;
