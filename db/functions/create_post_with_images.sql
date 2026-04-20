-- 原子事务：创建帖子同时插入图片
-- p_images: JSON 数组，每个元素含 url, storage_key, original_name, mime_type, file_size, width, height
CREATE OR REPLACE FUNCTION create_post_with_images(
  p_user_id    bigint,
  p_title      text,
  p_content    text,
  p_tags       text[],
  p_is_public  boolean,
  p_status     text,
  p_event_date date,
  p_images     jsonb DEFAULT '[]'::jsonb
)
RETURNS bigint
LANGUAGE plpgsql
AS $$
DECLARE
  v_post_id bigint;
  v_img     jsonb;
  v_idx     int := 0;
BEGIN
  INSERT INTO posts (user_id, title, content, tags, is_public, status, event_date)
  VALUES (p_user_id, p_title, p_content, p_tags, p_is_public, p_status, p_event_date)
  RETURNING id INTO v_post_id;

  FOR v_img IN SELECT * FROM jsonb_array_elements(p_images)
  LOOP
    INSERT INTO post_images
      (post_id, url, storage_key, original_name, mime_type, file_size, width, height, sort_order)
    VALUES (
      v_post_id,
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

  RETURN v_post_id;
END;
$$;
