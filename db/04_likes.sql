-- 点赞表（同时支持对帖子/评论点赞，通过 target_type 区分）
CREATE TABLE IF NOT EXISTS likes (
    id          BIGSERIAL       PRIMARY KEY,
    user_id     BIGINT          NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    target_type VARCHAR(20)     NOT NULL,                  -- 'post' | 'comment'
    target_id   BIGINT          NOT NULL,                  -- 对应 posts.id 或 comments.id
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    -- 同一用户对同一目标只能点赞一次
    CONSTRAINT uq_likes_user_target UNIQUE (user_id, target_type, target_id)
);

ALTER TABLE likes
    ADD CONSTRAINT chk_likes_target_type
    CHECK (target_type IN ('post', 'comment'));

CREATE INDEX IF NOT EXISTS idx_likes_target ON likes (target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_likes_user   ON likes (user_id);

-- 点赞后自动更新冗余计数（帖子）
CREATE OR REPLACE FUNCTION sync_like_count() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.target_type = 'post' THEN
            UPDATE posts    SET like_count = like_count + 1 WHERE id = NEW.target_id;
        ELSIF NEW.target_type = 'comment' THEN
            UPDATE comments SET like_count = like_count + 1 WHERE id = NEW.target_id;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.target_type = 'post' THEN
            UPDATE posts    SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.target_id;
        ELSIF OLD.target_type = 'comment' THEN
            UPDATE comments SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.target_id;
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_likes_sync
    AFTER INSERT OR DELETE ON likes
    FOR EACH ROW EXECUTE FUNCTION sync_like_count();

-- 评论后自动更新帖子评论数
CREATE OR REPLACE FUNCTION sync_comment_count() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.post_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_comments_sync
    AFTER INSERT OR DELETE ON comments
    FOR EACH ROW EXECUTE FUNCTION sync_comment_count();
