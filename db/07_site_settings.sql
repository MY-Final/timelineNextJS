-- 站点全局配置表（键值对）
CREATE TABLE IF NOT EXISTS site_settings (
    key         VARCHAR(100)    PRIMARY KEY,
    value       TEXT            NOT NULL DEFAULT '',
    description TEXT            NOT NULL DEFAULT '',
    updated_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- 预置默认值（ON CONFLICT 保证幂等）
INSERT INTO site_settings (key, value, description) VALUES
  ('site_name',            'Our Story',              '站点名称，显示在邮件和页面标题中'),
  ('registration_enabled', 'true',                   '是否开放注册：true / false'),
  ('email_daily_limit',    '100',                    '每个邮件账号每日最大发信数，0 表示不限制'),
  ('love_start_date',      '2026-03-08T18:35:00',    '在一起的日期时间（ISO 格式），用于计算计时器'),
  ('love_start_date_label','2026年3月8日',            '在一起日期的显示文字'),
  ('person_a_name',        '阳阳',                   '左侧人物名称'),
  ('person_b_name',        '湘湘',                   '右侧人物名称'),
  ('avatar_a',             'https://q1.qlogo.cn/g?b=qq&nk=3486159271&s=640', '左侧头像 URL'),
  ('avatar_b',             'https://q1.qlogo.cn/g?b=qq&nk=1789859045&s=640', '右侧头像 URL')
ON CONFLICT (key) DO NOTHING;
