-- 时光轴查询：返回所有已发布公开帖子，附带图片数组和 is_liked 状态
-- 在 Supabase SQL 编辑器运行此文件以创建函数
CREATE OR REPLACE FUNCTION get_timeline(p_user_id bigint DEFAULT NULL)
RETURNS TABLE (
  id            bigint,
  title         text,
  content       text,
  tags          text[],
  event_date    date,
  created_at    timestamptz,
  like_count    int,
  comment_count int,
  is_liked      boolean,
  images        jsonb
)
LANGUAGE sql STABLE
AS $$
  SELECT
    p.id,
    p.title,
    p.content,
    p.tags,
    p.event_date,
    p.created_at,
    p.like_count,
    p.comment_count,
    CASE WHEN ul.id IS NOT NULL THEN true ELSE false END AS is_liked,
    COALESCE(
      json_agg(
        json_build_object(
          'url',           pi.url,
          'storage_key',   pi.storage_key,
          'original_name', pi.original_name,
          'mime_type',     pi.mime_type,
          'sort_order',    pi.sort_order
        ) ORDER BY pi.sort_order
      ) FILTER (WHERE pi.id IS NOT NULL),
      '[]'
    )::jsonb AS images
  FROM posts p
  LEFT JOIN post_images pi ON pi.post_id = p.id
  LEFT JOIN likes ul ON ul.target_type = 'post' AND ul.target_id = p.id AND ul.user_id = p_user_id
  WHERE p.status = 'published'
    AND p.is_public = true
  GROUP BY p.id, ul.id
  ORDER BY COALESCE(p.event_date, p.created_at::date) DESC
$$;
