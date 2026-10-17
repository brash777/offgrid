CREATE TABLE users (
    id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    email          VARCHAR(255) NOT NULL,
    password_hash  VARCHAR(255) NOT NULL,
    full_name      VARCHAR(120) NOT NULL,
    role           VARCHAR(20)  NOT NULL DEFAULT 'CUSTOMER',
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ck_users_role CHECK (role IN ('CUSTOMER', 'ADMIN'))
);

CREATE UNIQUE INDEX ux_users_email_lower ON users (lower(email));

CREATE TABLE refresh_tokens (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token_hash  VARCHAR(64)  NOT NULL,
    expires_at  TIMESTAMPTZ  NOT NULL,
    revoked_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX ux_refresh_tokens_hash ON refresh_tokens (token_hash);
CREATE INDEX ix_refresh_tokens_user ON refresh_tokens (user_id);

CREATE TABLE password_reset_tokens (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token_hash  VARCHAR(64)  NOT NULL,
    expires_at  TIMESTAMPTZ  NOT NULL,
    used_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX ux_password_reset_tokens_hash ON password_reset_tokens (token_hash);
CREATE INDEX ix_password_reset_tokens_user ON password_reset_tokens (user_id);

CREATE TABLE user_profiles (
    user_id     UUID         PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    height_cm   SMALLINT,
    build       VARCHAR(20),
    usual_size  VARCHAR(10),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ck_user_profiles_build CHECK (build IN ('SLIM', 'REGULAR', 'ATHLETIC', 'PLUS')),
    CONSTRAINT ck_user_profiles_height CHECK (height_cm BETWEEN 100 AND 230)
);

CREATE TABLE avatars (
    id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id            UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    source_photo_path  VARCHAR(500),
    config             JSONB        NOT NULL DEFAULT '{}'::jsonb,
    status             VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    generated_at       TIMESTAMPTZ,
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ux_avatars_user UNIQUE (user_id),
    CONSTRAINT ck_avatars_status CHECK (status IN ('PENDING', 'READY', 'FAILED'))
);

CREATE TABLE categories (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    slug        VARCHAR(60)  NOT NULL,
    name        VARCHAR(80)  NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ux_categories_slug UNIQUE (slug)
);

CREATE TABLE products (
    id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id  UUID          NOT NULL REFERENCES categories (id),
    name         VARCHAR(140)  NOT NULL,
    description  TEXT          NOT NULL DEFAULT '',
    base_price   NUMERIC(14,2) NOT NULL,
    slot         VARCHAR(20)   NOT NULL,
    is_active    BOOLEAN       NOT NULL DEFAULT true,
    created_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT ck_products_slot CHECK (slot IN ('HEAD', 'TORSO', 'LEGS', 'FEET', 'ACCESSORY')),
    CONSTRAINT ck_products_price CHECK (base_price >= 0)
);

CREATE INDEX ix_products_category ON products (category_id);
CREATE INDEX ix_products_slot ON products (slot);

CREATE TABLE product_variants (
    id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id      UUID          NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    size            VARCHAR(10)   NOT NULL,
    color_name      VARCHAR(40)   NOT NULL,
    color_hex       VARCHAR(7)    NOT NULL,
    sku             VARCHAR(40)   NOT NULL,
    price_override  NUMERIC(14,2),
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT ux_product_variants_sku UNIQUE (sku),
    CONSTRAINT ux_product_variants_combo UNIQUE (product_id, size, color_name),
    CONSTRAINT ck_product_variants_price CHECK (price_override >= 0)
);

CREATE INDEX ix_product_variants_product ON product_variants (product_id);

CREATE TABLE product_images (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id  UUID         NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    variant_id  UUID         REFERENCES product_variants (id) ON DELETE CASCADE,
    path        VARCHAR(500) NOT NULL,
    position    SMALLINT     NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX ix_product_images_product ON product_images (product_id);

CREATE TABLE assets_3d (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id      UUID         NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    slot            VARCHAR(20)  NOT NULL,
    model_path      VARCHAR(500) NOT NULL,
    thumbnail_path  VARCHAR(500),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ux_assets_3d_product UNIQUE (product_id),
    CONSTRAINT ck_assets_3d_slot CHECK (slot IN ('HEAD', 'TORSO', 'LEGS', 'FEET', 'ACCESSORY'))
);

CREATE TABLE avatar_outfits (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    avatar_id   UUID         NOT NULL REFERENCES avatars (id) ON DELETE CASCADE,
    name        VARCHAR(80)  NOT NULL,
    is_default  BOOLEAN      NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX ix_avatar_outfits_avatar ON avatar_outfits (avatar_id);

CREATE TABLE avatar_outfit_items (
    id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    outfit_id           UUID         NOT NULL REFERENCES avatar_outfits (id) ON DELETE CASCADE,
    product_variant_id  UUID         NOT NULL REFERENCES product_variants (id),
    slot                VARCHAR(20)  NOT NULL,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ux_avatar_outfit_items_slot UNIQUE (outfit_id, slot),
    CONSTRAINT ck_avatar_outfit_items_slot CHECK (slot IN ('HEAD', 'TORSO', 'LEGS', 'FEET', 'ACCESSORY'))
);

CREATE TABLE carts (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ux_carts_user UNIQUE (user_id)
);

CREATE TABLE cart_items (
    id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id             UUID         NOT NULL REFERENCES carts (id) ON DELETE CASCADE,
    product_variant_id  UUID         NOT NULL REFERENCES product_variants (id),
    quantity            SMALLINT     NOT NULL,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ux_cart_items_variant UNIQUE (cart_id, product_variant_id),
    CONSTRAINT ck_cart_items_quantity CHECK (quantity > 0)
);

CREATE INDEX ix_cart_items_cart ON cart_items (cart_id);

CREATE TABLE orders (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID         NOT NULL REFERENCES users (id),
    status      VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ck_orders_status CHECK (status IN ('PENDING', 'PAID', 'CANCELLED'))
);

CREATE INDEX ix_orders_user ON orders (user_id);

CREATE TABLE order_items (
    id                      UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id                UUID          NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
    product_variant_id      UUID          NOT NULL REFERENCES product_variants (id),
    product_name_snapshot   VARCHAR(140)  NOT NULL,
    variant_label_snapshot  VARCHAR(60)   NOT NULL,
    unit_price_snapshot     NUMERIC(14,2) NOT NULL,
    quantity                SMALLINT      NOT NULL,
    created_at              TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT ck_order_items_quantity CHECK (quantity > 0),
    CONSTRAINT ck_order_items_price CHECK (unit_price_snapshot >= 0)
);

CREATE INDEX ix_order_items_order ON order_items (order_id);

CREATE TABLE payments (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id    UUID         NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
    method      VARCHAR(20)  NOT NULL DEFAULT 'SIMULATED',
    status      VARCHAR(20)  NOT NULL,
    paid_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ux_payments_order UNIQUE (order_id),
    CONSTRAINT ck_payments_status CHECK (status IN ('APPROVED', 'REJECTED'))
);

CREATE TABLE stock_movements (
    id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    product_variant_id  UUID         NOT NULL REFERENCES product_variants (id),
    quantity_delta      INTEGER      NOT NULL,
    reason              VARCHAR(20)  NOT NULL,
    reference_order_id  UUID         REFERENCES orders (id),
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ck_stock_movements_reason CHECK (reason IN ('RESTOCK', 'SALE', 'ADJUSTMENT', 'RETURN')),
    CONSTRAINT ck_stock_movements_delta CHECK (quantity_delta <> 0)
);

CREATE INDEX ix_stock_movements_variant ON stock_movements (product_variant_id);

CREATE TABLE favorites (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    product_id  UUID         NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ux_favorites_user_product UNIQUE (user_id, product_id)
);

CREATE TABLE reviews (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id  UUID         NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    user_id     UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    rating      SMALLINT     NOT NULL,
    comment     TEXT         NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ux_reviews_user_product UNIQUE (user_id, product_id),
    CONSTRAINT ck_reviews_rating CHECK (rating BETWEEN 1 AND 5)
);

CREATE INDEX ix_reviews_product ON reviews (product_id);

CREATE TABLE ai_conversations (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    title       VARCHAR(140),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX ix_ai_conversations_user ON ai_conversations (user_id);

CREATE TABLE ai_messages (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id  UUID         NOT NULL REFERENCES ai_conversations (id) ON DELETE CASCADE,
    role             VARCHAR(10)  NOT NULL,
    content          TEXT         NOT NULL,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ck_ai_messages_role CHECK (role IN ('USER', 'ASSISTANT', 'TOOL'))
);

CREATE INDEX ix_ai_messages_conversation ON ai_messages (conversation_id);
