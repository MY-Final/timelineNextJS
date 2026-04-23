-- IM 通知配置表（每个渠道一行）
CREATE TABLE IF NOT EXISTS im_config (
    id                 SERIAL PRIMARY KEY,
    type               VARCHAR(50)     NOT NULL UNIQUE,
    enabled            BOOLEAN         NOT NULL DEFAULT FALSE,
    config             JSONB           NOT NULL DEFAULT '{}'::jsonb,
    notify_on_like     BOOLEAN         NOT NULL DEFAULT TRUE,
    notify_on_comment  BOOLEAN         NOT NULL DEFAULT TRUE,
    notify_on_post     BOOLEAN         NOT NULL DEFAULT TRUE,
    email_threshold    INTEGER         NOT NULL DEFAULT 0,
    sort_order         INTEGER         NOT NULL DEFAULT 0,
    created_at         TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_im_config_enabled ON im_config (enabled);
CREATE INDEX IF NOT EXISTS idx_im_config_sort_order ON im_config (sort_order);

INSERT INTO im_config (type, sort_order)
VALUES
  ('onebot', 1),
  ('gotify', 2)
ON CONFLICT (type) DO NOTHING;

INSERT INTO im_config (
    type,
    enabled,
    config,
    notify_on_like,
    notify_on_comment,
    notify_on_post,
    email_threshold,
    sort_order,
    updated_at
)
SELECT
    'onebot',
    oc.enabled,
    jsonb_build_object(
      'http_url', oc.http_url,
      'access_token', oc.access_token,
      'target_qq', oc.target_qq,
      'target_group', oc.target_group
    ),
    oc.notify_on_like,
    oc.notify_on_comment,
    oc.notify_on_post,
    oc.email_threshold,
    1,
    oc.updated_at
FROM onebot_config oc
WHERE oc.id = 1
ON CONFLICT (type) DO UPDATE SET
    enabled = EXCLUDED.enabled,
    config = EXCLUDED.config,
    notify_on_like = EXCLUDED.notify_on_like,
    notify_on_comment = EXCLUDED.notify_on_comment,
    notify_on_post = EXCLUDED.notify_on_post,
    email_threshold = EXCLUDED.email_threshold,
    sort_order = EXCLUDED.sort_order,
    updated_at = EXCLUDED.updated_at;