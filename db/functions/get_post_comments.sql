-- 获取帖子评论列表（含子评论、is_liked 状态）
CREATE OR REPLACE FUNCTION get_post_comments(
  p_post_id  bigint,
  p_limit    int     DEFAULT 20,
  p_offset   int     DEFAULT 0,
  p_user_id  bigint  DEFAULT NULL
)
RETURNS TABLE (
  id                  bigint,
  post_id             bigint,
  parent_id           bigint,
  content             text,
  like_count          int,
  created_at          timestamptz,
  user_id             bigint,
  username            text,
  nickname            text,
  avatar              text,
  reply_to_username   text,
  reply_to_nickname   text,
  is_liked            boolean
)
LANGUAGE sql STABLE
AS $$
  SELECT
    c.id,
    c.post_id,
    c.parent_id,
    c.content,
    c.like_count,
    c.created_at,
    u.id        AS user_id,
    u.username,
    u.nickname,
    u.avatar,
    ru.username AS reply_to_username,
    ru.nickname AS reply_to_nickname,
    EXISTS(
      SELECT 1 FROM likes
      WHERE user_id    = p_user_id
        AND target_type = 'comment'
        AND target_id   = c.id
    ) AS is_liked
  FROM comments c
  JOIN users u  ON u.id  = c.user_id
  LEFT JOIN users ru ON ru.id = c.reply_to_user_id
  WHERE c.post_id = p_post_id
    AND c.status  = 'visible'
  ORDER BY c.parent_id NULLS FIRST, c.created_at ASC
  LIMIT p_limit OFFSET p_offset
$$;
