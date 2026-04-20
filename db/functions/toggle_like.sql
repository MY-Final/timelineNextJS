-- 点赞/取消点赞（幂等操作），返回最新 like_count
-- target_type: 'post' 或 'comment'
CREATE OR REPLACE FUNCTION toggle_like(
  p_user_id    bigint,
  p_target_type text,
  p_target_id  bigint
)
RETURNS TABLE (liked boolean, like_count int)
LANGUAGE plpgsql
AS $$
DECLARE
  v_liked boolean;
  v_count int;
BEGIN
  IF EXISTS (
    SELECT 1 FROM likes
    WHERE user_id = p_user_id
      AND target_type = p_target_type
      AND target_id   = p_target_id
  ) THEN
    DELETE FROM likes
    WHERE user_id = p_user_id
      AND target_type = p_target_type
      AND target_id   = p_target_id;
    v_liked := false;
  ELSE
    INSERT INTO likes (user_id, target_type, target_id)
    VALUES (p_user_id, p_target_type, p_target_id);
    v_liked := true;
  END IF;

  IF p_target_type = 'post' THEN
    SELECT l.like_count INTO v_count FROM posts l WHERE l.id = p_target_id;
  ELSE
    SELECT l.like_count INTO v_count FROM comments l WHERE l.id = p_target_id;
  END IF;

  RETURN QUERY SELECT v_liked, COALESCE(v_count, 0);
END;
$$;
