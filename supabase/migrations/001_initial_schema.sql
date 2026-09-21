-- 001_initial_schema.sql
-- Create order_status enum
CREATE TYPE order_status AS ENUM (
    'pending',
    'confirmed',
    'baking',
    'ready',
    'done',
    'cancelled'
);

-- 1. Categories table
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    display_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    image_url TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Products table
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    price INT NOT NULL CHECK (price >= 0),
    is_available BOOLEAN NOT NULL DEFAULT true,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Settings table
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Orders table
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    customer_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    social_username TEXT NOT NULL,
    order_channel TEXT NOT NULL,
    custom_channel_name TEXT DEFAULT NULL,
    delivery_address TEXT NOT NULL,
    pickup_date DATE NOT NULL,
    ship_payment_method TEXT NOT NULL,
    note TEXT DEFAULT NULL,
    subtotal INT NOT NULL CHECK (subtotal >= 0),
    packing_fee INT NOT NULL CHECK (packing_fee >= 0),
    total_price INT NOT NULL CHECK (total_price >= 0),
    status order_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Order items table (snapshot of name & price at order time)
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    unit_price INT NOT NULL CHECK (unit_price >= 0),
    quantity INT NOT NULL CHECK (quantity >= 1 AND quantity <= 50),
    line_total INT NOT NULL CHECK (line_total >= 0)
);

-- Indexes for fast lookup & filtering
CREATE INDEX idx_orders_pickup_date_status ON orders(pickup_date, status);
CREATE UNIQUE INDEX idx_orders_code ON orders(code);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);

-- Enable RLS on all tables with NO public policies
-- The backend talks to Supabase using the service role key which bypasses RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
