-- SMTP 邮箱账号表
-- 支持多账号管理，可按用途选择发件人
CREATE TABLE IF NOT EXISTS email_accounts (
    id          BIGSERIAL       PRIMARY KEY,
    name        VARCHAR(100)    NOT NULL,                     -- 账号名称（备注）
    host        VARCHAR(200)    NOT NULL,                     -- SMTP 服务器地址
    port        SMALLINT        NOT NULL DEFAULT 465,         -- SMTP 端口
    secure      BOOLEAN         NOT NULL DEFAULT TRUE,        -- 是否使用 SSL/TLS
    user_addr   VARCHAR(200)    NOT NULL,                     -- 发件邮箱地址
    password    VARCHAR(500)    NOT NULL,                     -- 邮箱密码 / 授权码（加密存储）
    from_name   VARCHAR(100)    NOT NULL DEFAULT '',          -- 发件人显示名称
    is_active   BOOLEAN         NOT NULL DEFAULT TRUE,        -- 是否启用
    use_for_reg BOOLEAN         NOT NULL DEFAULT FALSE,       -- 是否用于注册验证
    use_for_pwd BOOLEAN         NOT NULL DEFAULT FALSE,       -- 是否用于找回密码
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_accounts_is_active ON email_accounts (is_active);
