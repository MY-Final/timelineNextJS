-- ============================================================
-- 99_functions_and_seed.sql
-- 此文件由 docker-entrypoint-initdb.d 在表结构创建后自动执行
-- 包含所有存储函数定义 + 初始 superadmin 账号
-- ============================================================

-- ── 存储函数 ─────────────────────────────────────────────────

\i /docker-entrypoint-initdb.d/functions/create_post_with_images.sql
\i /docker-entrypoint-initdb.d/functions/update_post_with_images.sql
\i /docker-entrypoint-initdb.d/functions/get_timeline.sql
\i /docker-entrypoint-initdb.d/functions/get_tags.sql
\i /docker-entrypoint-initdb.d/functions/get_post_comments.sql
\i /docker-entrypoint-initdb.d/functions/get_admin_posts.sql
\i /docker-entrypoint-initdb.d/functions/get_admin_comments.sql
\i /docker-entrypoint-initdb.d/functions/toggle_like.sql

-- ── 初始数据 ─────────────────────────────────────────────────

\i /docker-entrypoint-initdb.d/seed_superadmin.sql
