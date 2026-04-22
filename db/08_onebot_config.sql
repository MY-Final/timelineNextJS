-- OneBot 推送配置表（单行配置，始终操作 id = 1）
-- target_qq / target_group 支持多个，以英文逗号分隔，如 "12345,67890"
CREATE TABLE IF NOT EXISTS onebot_config (
    id               SERIAL          PRIMARY KEY,
    enabled          BOOLEAN         NOT NULL DEFAULT FALSE,
    http_url         VARCHAR(500)    NOT NULL DEFAULT '',        -- OneBot HTTP 地址，如 http://127.0.0.1:3000
    access_token     VARCHAR(500)    NOT NULL DEFAULT '',        -- Bearer Token（可为空）
    target_qq        TEXT            NOT NULL DEFAULT '',        -- 私聊目标 QQ 号，多个用英文逗号分隔
    target_group     TEXT            NOT NULL DEFAULT '',        -- 群号，多个用英文逗号分隔
    notify_on_like   BOOLEAN         NOT NULL DEFAULT TRUE,      -- 新增点赞时通知
    notify_on_comment BOOLEAN        NOT NULL DEFAULT TRUE,      -- 新评论时通知
    notify_on_post   BOOLEAN         NOT NULL DEFAULT TRUE,      -- 发新帖时通知
    email_threshold  INTEGER         NOT NULL DEFAULT 0,         -- 邮件每日发送量超过此值时通知，0 表示不启用
    updated_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- 初始化默认行（保证 id=1 始终存在）
INSERT INTO onebot_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
