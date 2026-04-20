-- 从已发布公开帖子中获取所有标签（去重排序）
CREATE OR REPLACE FUNCTION get_tags()
RETURNS TABLE (tag text)
LANGUAGE sql STABLE
AS $$
  SELECT DISTINCT unnest(tags) AS tag
  FROM posts
  WHERE status = 'published' AND is_public = true
  ORDER BY tag
$$;
