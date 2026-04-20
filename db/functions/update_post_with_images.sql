-- 原子事务：部分更新帖子字段，可选替换图片
-- p_updates: JSONB 对象，只包含需要更新的字段（key 存在 = 更新，不存在 = 不变，null 值 = 设为 NULL）
-- p_replace_images: 是否替换图片列表
-- p_images: 新图片数组（仅当 p_replace_images=true 时生效）
CREATE OR REPLACE FUNCTION update_post_with_images(
  p_post_id       bigint,
  p_updates       jsonb,
  p_replace_images boolean DEFAULT false,
  p_images        jsonb   DEFAULT '[]'::jsonb
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_img jsonb;
  v_idx int := 0;
BEGIN
  -- 检查帖子是否存在
  IF NOT EXISTS (SELECT 1 FROM posts WHERE id = p_post_id AND status != 'deleted') THEN
    RETURN false;
  END IF;

  UPDATE posts SET
    title      = CASE WHEN p_updates ? 'title'      THEN p_updates->>'title'                                         ELSE title      END,
    content    = CASE WHEN p_updates ? 'content'    THEN p_updates->>'content'                                       ELSE content    END,
    tags       = CASE WHEN p_updates ? 'tags'       THEN ARRAY(SELECT jsonb_array_elements_text(p_updates->'tags'))  ELSE tags       END,
    is_public  = CASE WHEN p_updates ? 'is_public'  THEN (p_updates->>'is_public')::boolean                          ELSE is_public  END,
    status     = CASE WHEN p_updates ? 'status'     THEN p_updates->>'status'                                        ELSE status     END,
    event_date = CASE WHEN p_updates ? 'event_date' THEN (p_updates->>'event_date')::date                            ELSE event_date END,
    updated_at = NOW()
  WHERE id = p_post_id;

  IF p_replace_images THEN
    DELETE FROM post_images WHERE post_id = p_post_id;

    FOR v_img IN SELECT * FROM jsonb_array_elements(p_images)
    LOOP
      INSERT INTO post_images
        (post_id, url, storage_key, original_name, mime_type, file_size, width, height, sort_order)
      VALUES (
        p_post_id,
        v_img->>'url',
        v_img->>'storage_key',
        COALESCE(v_img->>'original_name', ''),
        COALESCE(v_img->>'mime_type', 'image/jpeg'),
        COALESCE((v_img->>'file_size')::bigint, 0),
        CASE WHEN (v_img->>'width')  IS NULL THEN NULL ELSE (v_img->>'width')::int  END,
        CASE WHEN (v_img->>'height') IS NULL THEN NULL ELSE (v_img->>'height')::int END,
        v_idx
      );
      v_idx := v_idx + 1;
    END LOOP;
  END IF;

  RETURN true;
END;
$$;
