-- 帖子表
CREATE TABLE IF NOT EXISTS posts (
    id          BIGSERIAL       PRIMARY KEY,
    user_id     BIGINT          NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    title       VARCHAR(200)    NOT NULL DEFAULT '',       -- 标题（可选）
    content     TEXT            NOT NULL,                  -- 正文
    images      TEXT[]          DEFAULT '{}',              -- 图片 URL 数组
    tags        TEXT[]          DEFAULT '{}',              -- 标签数组
    is_public   BOOLEAN         NOT NULL DEFAULT TRUE,     -- 是否公开
    status      VARCHAR(20)     NOT NULL DEFAULT 'published', -- published / draft / deleted
    like_count  INT             NOT NULL DEFAULT 0,        -- 冗余点赞数（方便排序）
    comment_count INT           NOT NULL DEFAULT 0,        -- 冗余评论数
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

ALTER TABLE posts
    ADD CONSTRAINT chk_posts_status
    CHECK (status IN ('published', 'draft', 'deleted'));

CREATE INDEX IF NOT EXISTS idx_posts_user_id    ON posts (user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_tags       ON posts USING GIN (tags);
