-- IM 通知消息模版表
-- 每种事件类型一条记录，支持自定义变量插值
-- 可用变量：{site_name} {time} {username} {post_title} {content} {count} {threshold}

CREATE TABLE IF NOT EXISTS im_notification_templates (
    type        VARCHAR(50)     PRIMARY KEY,   -- like | comment | post | email_threshold
    template    TEXT            NOT NULL,      -- 含 {变量} 的模版字符串
    enabled     BOOLEAN         NOT NULL DEFAULT TRUE,  -- false 则使用内置默认
    updated_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

INSERT INTO im_notification_templates (type, template, enabled) VALUES
  ('like',
   '[{site_name}] 新点赞通知\n时间：{time}\n用户 {username} 赞了帖子「{post_title}」',
   TRUE),
  ('comment',
   '[{site_name}] 新评论通知\n时间：{time}\n用户 {username} 评论了帖子「{post_title}」：\n{content}',
   TRUE),
  ('post',
   '[{site_name}] 新帖子通知\n时间：{time}\n用户 {username} 发布了帖子「{post_title}」',
   TRUE),
  ('email_threshold',
   '[{site_name}] 邮件发送量预警\n时间：{time}\n今日邮件发送量已达 {count} 封，超过阈值 {threshold} 封',
   TRUE)
ON CONFLICT (type) DO NOTHING;
