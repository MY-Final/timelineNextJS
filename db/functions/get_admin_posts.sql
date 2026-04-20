-- 管理后台帖子列表（动态过滤 + 分页 + 图片统计）
-- 返回行中含 total_count（窗口函数），可从第一行读取总数
CREATE OR REPLACE FUNCTION get_admin_posts(
  p_status       text    DEFAULT 'all',
  p_is_public    text    DEFAULT NULL,  -- 'true' / 'false' / NULL
  p_q            text    DEFAULT '',
  p_created_from date    DEFAULT NULL,
  p_created_to   date    DEFAULT NULL,
  p_event_from   date    DEFAULT NULL,
  p_event_to     date    DEFAULT NULL,
  p_limit        int     DEFAULT 20,
  p_offset       int     DEFAULT 0
)
RETURNS TABLE (
  id              bigint,
  title           text,
  content         text,
  tags            text[],
  is_public       boolean,
  status          text,
  like_count      int,
  comment_count   int,
  created_at      timestamptz,
  updated_at      timestamptz,
  event_date      date,
  author_username text,
  author_nickname text,
  image_count     bigint,
  cover_url       text,
  total_count     bigint
)
LANGUAGE sql STABLE
AS $$
  SELECT
    p.id,
    p.title,
    p.content,
    p.tags,
    p.is_public,
    p.status::text,
    p.like_count,
    p.comment_count,
    p.created_at,
    p.updated_at,
    p.event_date,
    u.username AS author_username,
    u.nickname AS author_nickname,
    (SELECT COUNT(*)  FROM post_images pi WHERE pi.post_id = p.id) AS image_count,
    (SELECT pi2.url   FROM post_images pi2 WHERE pi2.post_id = p.id ORDER BY pi2.sort_order LIMIT 1) AS cover_url,
    COUNT(*) OVER () AS total_count
  FROM posts p
  JOIN users u ON u.id = p.user_id
  WHERE
    (
      (p_status = 'all' AND p.status != 'deleted')
      OR
      (p_status != 'all' AND p.status = p_status)
    )
    AND (p_is_public IS NULL OR p.is_public = (p_is_public = 'true'))
    AND (
      p_q = '' OR p_q IS NULL
      OR p.title    ILIKE '%' || p_q || '%'
      OR u.nickname ILIKE '%' || p_q || '%'
      OR u.username ILIKE '%' || p_q || '%'
    )
    AND (p_created_from IS NULL OR p.created_at >= p_created_from)
    AND (p_created_to   IS NULL OR p.created_at <  (p_created_to + INTERVAL '1 day'))
    AND (p_event_from   IS NULL OR p.event_date >= p_event_from)
    AND (p_event_to     IS NULL OR p.event_date <= p_event_to)
  ORDER BY p.created_at DESC
  LIMIT p_limit OFFSET p_offset
$$;
