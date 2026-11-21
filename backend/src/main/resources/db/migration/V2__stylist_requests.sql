CREATE TABLE stylist_requests (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    with_photo  BOOLEAN     NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_stylist_requests_user_created ON stylist_requests (user_id, created_at);
