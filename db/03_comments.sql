-- 评论表（支持楼中楼：parent_id 指向同表上级评论）
CREATE TABLE IF NOT EXISTS comments (
    id          BIGSERIAL       PRIMARY KEY,
    post_id     BIGINT          NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
    user_id     BIGINT          NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    parent_id   BIGINT          DEFAULT NULL REFERENCES comments (id) ON DELETE CASCADE, -- NULL 表示一级评论
    content     TEXT            NOT NULL,
    like_count  INT             NOT NULL DEFAULT 0,
    status      VARCHAR(20)     NOT NULL DEFAULT 'visible',  -- visible / hidden / deleted
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

ALTER TABLE comments
    ADD CONSTRAINT chk_comments_status
    CHECK (status IN ('visible', 'hidden', 'deleted'));

CREATE INDEX IF NOT EXISTS idx_comments_post_id   ON comments (post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id   ON comments (user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments (parent_id);
