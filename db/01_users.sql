-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id          BIGSERIAL       PRIMARY KEY,
    username    VARCHAR(50)     NOT NULL UNIQUE,           -- 账号（登录用）
    password    VARCHAR(255)    NOT NULL,                  -- 密码（bcrypt 哈希）
    nickname    VARCHAR(50)     NOT NULL DEFAULT '',       -- 昵称
    avatar      VARCHAR(500)    DEFAULT NULL,              -- 头像 URL
    gender      SMALLINT        NOT NULL DEFAULT 0,        -- 0 未知 1 男 2 女
    email       VARCHAR(100)    DEFAULT NULL UNIQUE,       -- 邮箱
    phone       VARCHAR(20)     DEFAULT NULL UNIQUE,       -- 手机号
    bio         VARCHAR(500)    DEFAULT NULL,              -- 个人简介
    role        VARCHAR(20)     NOT NULL DEFAULT 'user',   -- superadmin / admin / user
    is_active   BOOLEAN         NOT NULL DEFAULT TRUE,     -- 是否启用
    last_login  TIMESTAMPTZ     DEFAULT NULL,              -- 最后登录时间
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- role 枚举约束
ALTER TABLE users
    ADD CONSTRAINT chk_users_role
    CHECK (role IN ('superadmin', 'admin', 'user'));

-- 常用查询索引
CREATE INDEX IF NOT EXISTS idx_users_role       ON users (role);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users (created_at);
