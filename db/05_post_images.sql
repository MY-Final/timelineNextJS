-- 帖子图片表
-- 每张图片独立一行，与 posts 一对多关联。
-- 下载时文件名由后端拼接：帖子标题 + sort_order + 原始后缀（如 春天的花-1.jpg）。
CREATE TABLE IF NOT EXISTS post_images (
    id              BIGSERIAL       PRIMARY KEY,
    post_id         BIGINT          NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
    url             TEXT            NOT NULL,              -- R2 公开访问 URL
    storage_key     TEXT            NOT NULL,              -- R2 对象 Key，用于删除/替换
    original_name   TEXT            NOT NULL DEFAULT '',   -- 上传时的原始文件名（取后缀用）
    mime_type       VARCHAR(50)     NOT NULL DEFAULT 'image/jpeg',
    file_size       INT             NOT NULL DEFAULT 0,    -- 字节数
    width           INT,                                   -- 像素宽，前端预留空间用（可为 NULL）
    height          INT,                                   -- 像素高
    sort_order      SMALLINT        NOT NULL DEFAULT 0,    -- 帖内排列顺序，从 0 开始
    download_count  INT             NOT NULL DEFAULT 0,    -- 下载次数统计
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- 每篇帖子最多 10 张图片
ALTER TABLE post_images
    ADD CONSTRAINT chk_post_images_sort_order
    CHECK (sort_order >= 0 AND sort_order <= 9);

-- 同一帖子内 sort_order 不重复
CREATE UNIQUE INDEX IF NOT EXISTS uq_post_images_order
    ON post_images (post_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_post_images_post_id
    ON post_images (post_id);
