INSERT INTO users (id, email, password_hash, full_name, role)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'admin@flowstore.app',
     '$2y$10$1URKdBAWbx6dggPF7sw8OuAvPhFHQfRw3gu6OdeO0YZcuQg0vsQTu', 'Admin FlowStore', 'ADMIN'),
    ('22222222-2222-2222-2222-222222222222', 'cliente@flowstore.app',
     '$2y$10$KZwZe.0ybkE6xs85IKb6/OABd9psnczergczAT6JJAZzbxj4nTuLC', 'Cliente Demo', 'CUSTOMER');

INSERT INTO user_profiles (user_id, height_cm, build, usual_size)
VALUES ('22222222-2222-2222-2222-222222222222', 175, 'REGULAR', 'M');

INSERT INTO categories (slug, name)
VALUES
    ('camisetas', 'Camisetas'),
    ('chaquetas', 'Chaquetas'),
    ('pantalones', 'Pantalones'),
    ('calzado', 'Calzado'),
    ('gorras', 'Gorras'),
    ('accesorios', 'Accesorios');

INSERT INTO products (category_id, name, description, base_price, slot)
SELECT c.id, p.name, p.description, p.base_price, p.slot
FROM (VALUES
    ('Camiseta Oversize Básica', 'Camiseta de corte oversize en algodón, ideal para un look urbano relajado.', 45000.00, 'TORSO', 'camisetas'),
    ('Camiseta Estampada Street', 'Camiseta con estampado street en la espalda.', 55000.00, 'TORSO', 'camisetas'),
    ('Camiseta Gráfica Neón', 'Camiseta con gráfico neón de alto contraste.', 50000.00, 'TORSO', 'camisetas'),
    ('Camiseta Manga Larga Térmica', 'Camiseta manga larga térmica para climas fríos.', 60000.00, 'TORSO', 'camisetas'),
    ('Chaqueta Bomber Urbana', 'Chaqueta bomber con forro acolchado y bolsillos laterales.', 150000.00, 'TORSO', 'chaquetas'),
    ('Chaqueta Rompevientos Neón', 'Rompevientos liviano en color neón, ideal para capas.', 130000.00, 'TORSO', 'chaquetas'),
    ('Chaqueta Denim Oversize', 'Chaqueta de jean oversize con lavado claro.', 160000.00, 'TORSO', 'chaquetas'),
    ('Jean Recto Clásico', 'Jean de corte recto clásico, algodón resistente.', 95000.00, 'LEGS', 'pantalones'),
    ('Jogger Cargo Urbano', 'Jogger cargo con bolsillos funcionales y puño ajustable.', 90000.00, 'LEGS', 'pantalones'),
    ('Pantalón Cargo Técnico', 'Pantalón cargo técnico con múltiples bolsillos.', 105000.00, 'LEGS', 'pantalones'),
    ('Short Deportivo Street', 'Short deportivo cómodo para uso urbano.', 60000.00, 'LEGS', 'pantalones'),
    ('Sneakers Chunky Blancos', 'Sneakers de suela chunky, estilo streetwear.', 180000.00, 'FEET', 'calzado'),
    ('Botas Urbanas Negras', 'Botas urbanas resistentes, suela antideslizante.', 190000.00, 'FEET', 'calzado'),
    ('Sandalias Deportivas', 'Sandalias deportivas livianas para el día a día.', 70000.00, 'FEET', 'calzado'),
    ('Gorra Snapback Clásica', 'Gorra snapback de visera plana, ajuste trasero.', 45000.00, 'HEAD', 'gorras'),
    ('Gorra Trucker Neón', 'Gorra trucker con malla trasera y frente neón.', 48000.00, 'HEAD', 'gorras'),
    ('Lentes de Sol Futuristas', 'Lentes de sol de montura futurista, protección UV.', 55000.00, 'ACCESSORY', 'accesorios'),
    ('Cadena Plateada Oversize', 'Cadena plateada oversize, acero inoxidable.', 38000.00, 'ACCESSORY', 'accesorios'),
    ('Mochila Urbana Táctica', 'Mochila táctica urbana con múltiples compartimentos.', 120000.00, 'ACCESSORY', 'accesorios')
) AS p (name, description, base_price, slot, category_slug)
JOIN categories c ON c.slug = p.category_slug;

INSERT INTO product_variants (product_id, size, color_name, color_hex, sku)
SELECT pr.id, v.size, v.color_name, v.color_hex, v.sku
FROM (VALUES
    ('Camiseta Oversize Básica',     'S',   'Negro',         '#1a1a1a', 'CAM-OVB-NEG-S'),
    ('Camiseta Oversize Básica',     'M',   'Negro',         '#1a1a1a', 'CAM-OVB-NEG-M'),
    ('Camiseta Oversize Básica',     'L',   'Negro',         '#1a1a1a', 'CAM-OVB-NEG-L'),
    ('Camiseta Oversize Básica',     'S',   'Blanco',        '#f5f5f5', 'CAM-OVB-BLA-S'),
    ('Camiseta Oversize Básica',     'M',   'Blanco',        '#f5f5f5', 'CAM-OVB-BLA-M'),
    ('Camiseta Oversize Básica',     'L',   'Blanco',        '#f5f5f5', 'CAM-OVB-BLA-L'),
    ('Camiseta Estampada Street',    'S',   'Negro',         '#1a1a1a', 'CAM-EST-NEG-S'),
    ('Camiseta Estampada Street',    'M',   'Negro',         '#1a1a1a', 'CAM-EST-NEG-M'),
    ('Camiseta Estampada Street',    'L',   'Verde Militar', '#4b5320', 'CAM-EST-VER-L'),
    ('Camiseta Gráfica Neón',        'M',   'Negro',         '#1a1a1a', 'CAM-GRA-NEG-M'),
    ('Camiseta Gráfica Neón',        'L',   'Negro',         '#1a1a1a', 'CAM-GRA-NEG-L'),
    ('Camiseta Manga Larga Térmica', 'M',   'Gris',          '#808080', 'CAM-TER-GRI-M'),
    ('Camiseta Manga Larga Térmica', 'L',   'Gris',          '#808080', 'CAM-TER-GRI-L'),
    ('Chaqueta Bomber Urbana',       'M',   'Negro',         '#1a1a1a', 'CHA-BOM-NEG-M'),
    ('Chaqueta Bomber Urbana',       'L',   'Negro',         '#1a1a1a', 'CHA-BOM-NEG-L'),
    ('Chaqueta Bomber Urbana',       'M',   'Azul',          '#1e3a8a', 'CHA-BOM-AZU-M'),
    ('Chaqueta Rompevientos Neón',   'S',   'Verde Neón',    '#39ff14', 'CHA-ROM-NEO-S'),
    ('Chaqueta Rompevientos Neón',   'M',   'Verde Neón',    '#39ff14', 'CHA-ROM-NEO-M'),
    ('Chaqueta Denim Oversize',      'M',   'Azul',          '#3b6ea5', 'CHA-DEN-AZU-M'),
    ('Chaqueta Denim Oversize',      'L',   'Azul',          '#3b6ea5', 'CHA-DEN-AZU-L'),
    ('Jean Recto Clásico',           '30',  'Azul',          '#2c4a7c', 'JEA-REC-AZU-30'),
    ('Jean Recto Clásico',           '32',  'Azul',          '#2c4a7c', 'JEA-REC-AZU-32'),
    ('Jean Recto Clásico',           '32',  'Negro',         '#1a1a1a', 'JEA-REC-NEG-32'),
    ('Jogger Cargo Urbano',          'M',   'Verde Militar', '#4b5320', 'JOG-CAR-VER-M'),
    ('Jogger Cargo Urbano',          'L',   'Verde Militar', '#4b5320', 'JOG-CAR-VER-L'),
    ('Pantalón Cargo Técnico',       'M',   'Negro',         '#1a1a1a', 'PAN-CAR-NEG-M'),
    ('Pantalón Cargo Técnico',       'L',   'Negro',         '#1a1a1a', 'PAN-CAR-NEG-L'),
    ('Short Deportivo Street',       'M',   'Gris',          '#808080', 'SHO-DEP-GRI-M'),
    ('Sneakers Chunky Blancos',      '39',  'Blanco',        '#f5f5f5', 'SNE-CHU-BLA-39'),
    ('Sneakers Chunky Blancos',      '40',  'Blanco',        '#f5f5f5', 'SNE-CHU-BLA-40'),
    ('Sneakers Chunky Blancos',      '41',  'Blanco',        '#f5f5f5', 'SNE-CHU-BLA-41'),
    ('Botas Urbanas Negras',         '40',  'Negro',         '#1a1a1a', 'BOT-URB-NEG-40'),
    ('Botas Urbanas Negras',         '41',  'Negro',         '#1a1a1a', 'BOT-URB-NEG-41'),
    ('Sandalias Deportivas',         '40',  'Gris',          '#808080', 'SAN-DEP-GRI-40'),
    ('Gorra Snapback Clásica',       'UNI', 'Negro',         '#1a1a1a', 'GOR-SNA-NEG-UNI'),
    ('Gorra Snapback Clásica',       'UNI', 'Blanco',        '#f5f5f5', 'GOR-SNA-BLA-UNI'),
    ('Gorra Trucker Neón',           'UNI', 'Verde Neón',    '#39ff14', 'GOR-TRU-NEO-UNI'),
    ('Lentes de Sol Futuristas',     'UNI', 'Negro',         '#1a1a1a', 'LEN-FUT-NEG-UNI'),
    ('Cadena Plateada Oversize',     'UNI', 'Plateado',      '#c0c0c0', 'CAD-PLA-PLA-UNI'),
    ('Mochila Urbana Táctica',       'UNI', 'Negro',         '#1a1a1a', 'MOC-URB-NEG-UNI')
) AS v (product_name, size, color_name, color_hex, sku)
JOIN products pr ON pr.name = v.product_name;

INSERT INTO stock_movements (product_variant_id, quantity_delta, reason)
SELECT id, 15, 'RESTOCK' FROM product_variants;
