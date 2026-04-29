-- Function: get_admin_comments
-- Returns paginated admin comment list with user and post info
CREATE OR REPLACE FUNCTION get_admin_comments(
  p_status text DEFAULT '',
  p_post_id bigint DEFAULT NULL,
  p_keyword text DEFAULT '',
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id bigint,
  post_id bigint,
  parent_id bigint,
  content text,
  like_count integer,
  status text,
  created_at timestamptz,
  user_id bigint,
  username text,
  nickname text,
  post_title text,
  total_count bigint
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id, c.post_id, c.parent_id, c.content::text, c.like_count,
    c.status, c.created_at,
    u.id AS user_id, u.username::text, u.nickname::text,
    p.title::text AS post_title,
    COUNT(*) OVER() AS total_count
  FROM comments c
  JOIN users u ON u.id = c.user_id
  JOIN posts p ON p.id = c.post_id
  WHERE c.status != 'deleted'
    AND (p_status = '' OR c.status = p_status)
    AND (p_post_id IS NULL OR c.post_id = p_post_id)
    AND (p_keyword = '' OR (
      c.content ILIKE '%' || p_keyword || '%'
      OR u.username ILIKE '%' || p_keyword || '%'
      OR u.nickname ILIKE '%' || p_keyword || '%'
    ))
  ORDER BY c.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;
