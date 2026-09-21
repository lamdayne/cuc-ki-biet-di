-- 002_create_order_rpc.sql
-- Function to atomically create an order with advisory locking, 4-order limit check, and price recalculation

CREATE OR REPLACE FUNCTION create_preorder(
    p_code TEXT,
    p_customer_name TEXT,
    p_phone TEXT,
    p_social_username TEXT,
    p_order_channel TEXT,
    p_custom_channel_name TEXT,
    p_delivery_address TEXT,
    p_pickup_date DATE,
    p_ship_payment_method TEXT,
    p_note TEXT,
    p_items JSONB -- array of objects: [{"product_id": "uuid", "quantity": 2}, ...]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_count INT;
    v_subtotal INT := 0;
    v_packing_fee INT := 2000;
    v_total_price INT := 0;
    v_order_id UUID;
    v_item RECORD;
    v_product RECORD;
    v_line_total INT;
    v_result JSONB;
BEGIN
    -- 1. Acquire transaction advisory lock for this pickup date
    -- Any concurrent transaction attempting to order on the exact same date will queue here
    PERFORM pg_advisory_xact_lock(hashtext('cookie_pickup_' || p_pickup_date::text));

    -- 2. Count active (non-cancelled) orders for the requested pickup date
    SELECT count(*)
    INTO v_order_count
    FROM orders
    WHERE pickup_date = p_pickup_date
      AND status != 'cancelled';

    IF v_order_count >= 4 THEN
        RAISE EXCEPTION 'DAY_CAPACITY_FULL: Ngày nhận % đã đủ 4 đơn hàng. Vui lòng chọn ngày khác.', p_pickup_date;
    END IF;

    -- 3. Verify at least one item is provided
    IF jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'EMPTY_ITEMS: Đơn hàng phải có ít nhất 1 sản phẩm.';
    END IF;

    -- 4. Get packing fee from settings table (defaults to 2000 if not found)
    SELECT COALESCE((value->>'amount')::int, 2000)
    INTO v_packing_fee
    FROM settings
    WHERE key = 'packing_fee';

    IF v_packing_fee IS NULL THEN
        v_packing_fee := 2000;
    END IF;

    -- 5. Validate all items and calculate subtotal using current product prices
    FOR v_item IN
        SELECT 
            (item->>'product_id')::uuid AS product_id,
            (item->>'quantity')::int AS quantity
        FROM jsonb_array_elements(p_items) AS item
    LOOP
        IF v_item.quantity < 1 OR v_item.quantity > 50 THEN
            RAISE EXCEPTION 'INVALID_QUANTITY: Số lượng mỗi loại bánh phải từ 1 đến 50.';
        END IF;

        SELECT id, name, price, is_available
        INTO v_product
        FROM products
        WHERE id = v_item.product_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'PRODUCT_NOT_FOUND: Sản phẩm không tồn tại hoặc đã bị xóa.';
        END IF;

        IF NOT v_product.is_available THEN
            RAISE EXCEPTION 'PRODUCT_UNAVAILABLE: Bánh "%" hiện tạm hết, vui lòng chọn loại khác.', v_product.name;
        END IF;

        v_subtotal := v_subtotal + (v_product.price * v_item.quantity);
    END LOOP;

    v_total_price := v_subtotal + v_packing_fee;

    -- 6. Insert order
    INSERT INTO orders (
        code,
        customer_name,
        phone,
        social_username,
        order_channel,
        custom_channel_name,
        delivery_address,
        pickup_date,
        ship_payment_method,
        note,
        subtotal,
        packing_fee,
        total_price,
        status
    )
    VALUES (
        p_code,
        p_customer_name,
        p_phone,
        p_social_username,
        p_order_channel,
        p_custom_channel_name,
        p_delivery_address,
        p_pickup_date,
        p_ship_payment_method,
        p_note,
        v_subtotal,
        v_packing_fee,
        v_total_price,
        'pending'
    )
    RETURNING id INTO v_order_id;

    -- 7. Insert order items with snapshots
    FOR v_item IN
        SELECT 
            (item->>'product_id')::uuid AS product_id,
            (item->>'quantity')::int AS quantity
        FROM jsonb_array_elements(p_items) AS item
    LOOP
        SELECT name, price
        INTO v_product
        FROM products
        WHERE id = v_item.product_id;

        v_line_total := v_product.price * v_item.quantity;

        INSERT INTO order_items (
            order_id,
            product_id,
            product_name,
            unit_price,
            quantity,
            line_total
        )
        VALUES (
            v_order_id,
            v_item.product_id,
            v_product.name,
            v_product.price,
            v_item.quantity,
            v_line_total
        );
    END LOOP;

    -- 8. Return response summary
    v_result := jsonb_build_object(
        'order_id', v_order_id,
        'code', p_code,
        'pickup_date', p_pickup_date,
        'subtotal', v_subtotal,
        'packing_fee', v_packing_fee,
        'total_price', v_total_price,
        'status', 'pending'
    );

    RETURN v_result;
END;
$$;
