-- seed.sql
-- Seed default settings
INSERT INTO settings (key, value)
VALUES ('packing_fee', '{"amount": 2000}')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Seed categories & products
DO $$
DECLARE
    cat_chocochip UUID := gen_random_uuid();
    cat_nganhy UUID := gen_random_uuid();
    cat_khuon UUID := gen_random_uuid();
    cat_smore UUID := gen_random_uuid();
BEGIN
    -- Insert categories (image_url starts as NULL, display_order ordered)
    INSERT INTO categories (id, name, slug, display_order, is_active, image_url)
    VALUES
        (cat_chocochip, 'CÚC KI CHOCOCHIP', 'cuc-ki-chocochip', 1, true, NULL),
        (cat_nganhy, 'CÚC KI NGÀNH Y', 'cuc-ki-nganh-y', 2, true, NULL),
        (cat_khuon, 'CÚC KI KHUÔN', 'cuc-ki-khuon', 3, true, NULL),
        (cat_smore, 'S''MORE NUTS', 'smore-nuts', 4, true, NULL)
    ON CONFLICT (slug) DO NOTHING;

    -- Look up IDs in case they already existed by slug
    SELECT id INTO cat_chocochip FROM categories WHERE slug = 'cuc-ki-chocochip';
    SELECT id INTO cat_nganhy FROM categories WHERE slug = 'cuc-ki-nganh-y';
    SELECT id INTO cat_khuon FROM categories WHERE slug = 'cuc-ki-khuon';
    SELECT id INTO cat_smore FROM categories WHERE slug = 'smore-nuts';

    -- Insert products for CÚC KI CHOCOCHIP
    INSERT INTO products (category_id, name, price, is_available, display_order)
    VALUES
        (cat_chocochip, 'Chocochip Cacao', 14000, true, 1),
        (cat_chocochip, 'Chocochip Matcha', 14000, true, 2),
        (cat_chocochip, 'Chocochip Red Velvet', 15000, true, 3),
        (cat_chocochip, 'Chocochip Oreo', 17000, true, 4),
        (cat_chocochip, 'Chocochip Nguyên Vị', 12000, true, 5);

    -- Insert products for CÚC KI NGÀNH Y
    INSERT INTO products (category_id, name, price, is_available, display_order)
    VALUES
        (cat_nganhy, 'Strawberry Cúc-Ki', 19000, true, 1),
        (cat_nganhy, 'Orange Cúc-Ki', 16000, true, 2),
        (cat_nganhy, 'Chocomint Cúc-Ki', 19000, true, 3),
        (cat_nganhy, 'Glass Cúc-Ki', 5000, true, 4);

    -- Insert products for CÚC KI KHUÔN
    INSERT INTO products (category_id, name, price, is_available, display_order)
    VALUES
        (cat_khuon, 'Cacao', 5000, true, 1),
        (cat_khuon, 'Matcha', 5000, true, 2),
        (cat_khuon, 'Nguyên Vị', 3000, true, 3);

    -- Insert products for S'MORE NUTS
    INSERT INTO products (category_id, name, price, is_available, display_order)
    VALUES
        (cat_smore, 'S''more Nuts Cacao', 17000, true, 1),
        (cat_smore, 'S''more Nuts Matcha', 17000, true, 2),
        (cat_smore, 'S''more Nuts Nguyên Vị', 14000, true, 3);
END $$;
