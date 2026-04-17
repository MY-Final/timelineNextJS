-- superadmin 初始账号：final / 123456
-- 密码已使用 bcrypt（cost=10）哈希，业务层用 bcryptjs.compare() 验证
INSERT INTO users (username, password, nickname, role)
VALUES (
    'final',
    '$2b$10$2fy..VblLBsdesVvhjNoi.gTr37iylqu8vFj8AzL3M57qdQKvJvCC',
    'Final',
    'superadmin'
)
ON CONFLICT (username) DO NOTHING;
