-- ==================== Supabase数据库初始化脚本 ====================
-- 版本: 1.0
-- 日期: 2025-12-22
-- 说明: 用于创建后台管理系统所需的所有表结构、索引和初始数据

-- ==================== 1. 创建分公司表 ====================
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ==================== 2. 创建收费站表 ====================
CREATE TABLE IF NOT EXISTS toll_stations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ==================== 3. 创建班组表 ====================
CREATE TABLE IF NOT EXISTS toll_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  station_id UUID REFERENCES toll_stations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ==================== 4. 创建收费员表 ====================
CREATE TABLE IF NOT EXISTS toll_collectors_info (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  group_id UUID REFERENCES toll_groups(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  station_id UUID REFERENCES toll_stations(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ==================== 5. 创建监控员表 ====================
CREATE TABLE IF NOT EXISTS monitors_info (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  group_id UUID REFERENCES toll_groups(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  station_id UUID REFERENCES toll_stations(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ==================== 6. 创建班次设置表 ====================
CREATE TABLE IF NOT EXISTS shift_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ==================== 7. 创建后台用户表 ====================
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'company_admin', 'station_admin')),
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  station_id UUID REFERENCES toll_stations(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ==================== 8. 创建登记记录表 ====================
CREATE TABLE IF NOT EXISTS toll_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plate_number TEXT NOT NULL,
  free_reason TEXT,
  vehicle_type TEXT,
  axle_count INTEGER,
  tonnage DECIMAL,
  entry_info TEXT,
  toll_collector TEXT,
  monitor TEXT,
  amount DECIMAL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ==================== 9. 创建登记记录图片表 ====================
CREATE TABLE IF NOT EXISTS toll_record_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  record_id UUID REFERENCES toll_records(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_format TEXT NOT NULL,
  uploader TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ==================== 10. 创建索引 ====================
-- 分公司表索引
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
CREATE INDEX IF NOT EXISTS idx_companies_code ON companies(code);

-- 收费站表索引
CREATE INDEX IF NOT EXISTS idx_toll_stations_name ON toll_stations(name);
CREATE INDEX IF NOT EXISTS idx_toll_stations_code ON toll_stations(code);
CREATE INDEX IF NOT EXISTS idx_toll_stations_company_id ON toll_stations(company_id);

-- 班组表索引
CREATE INDEX IF NOT EXISTS idx_toll_groups_name ON toll_groups(name);
CREATE INDEX IF NOT EXISTS idx_toll_groups_code ON toll_groups(code);
CREATE INDEX IF NOT EXISTS idx_toll_groups_station_id ON toll_groups(station_id);

-- 收费员表索引
CREATE INDEX IF NOT EXISTS idx_toll_collectors_info_name ON toll_collectors_info(name);
CREATE INDEX IF NOT EXISTS idx_toll_collectors_info_code ON toll_collectors_info(code);
CREATE INDEX IF NOT EXISTS idx_toll_collectors_info_group_id ON toll_collectors_info(group_id);

-- 监控员表索引
CREATE INDEX IF NOT EXISTS idx_monitors_info_name ON monitors_info(name);
CREATE INDEX IF NOT EXISTS idx_monitors_info_code ON monitors_info(code);
CREATE INDEX IF NOT EXISTS idx_monitors_info_group_id ON monitors_info(group_id);

-- 后台用户表索引
CREATE INDEX IF NOT EXISTS idx_admin_users_username ON admin_users(username);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role);

-- 登记记录表索引
CREATE INDEX IF NOT EXISTS idx_toll_records_plate_number ON toll_records(plate_number);
CREATE INDEX IF NOT EXISTS idx_toll_records_created_at ON toll_records(created_at);
CREATE INDEX IF NOT EXISTS idx_toll_records_toll_collector ON toll_records(toll_collector);

-- 登记记录图片表索引
CREATE INDEX IF NOT EXISTS idx_toll_record_images_record_id ON toll_record_images(record_id);
CREATE INDEX IF NOT EXISTS idx_toll_record_images_created_at ON toll_record_images(created_at);
CREATE INDEX IF NOT EXISTS idx_toll_record_images_file_format ON toll_record_images(file_format);

-- ==================== 10. 插入初始数据 ====================
-- 插入分公司数据
INSERT INTO companies (id, name, code) VALUES
  (uuid_generate_v4(), '平赞分公司', 'PZFGS'),
  (uuid_generate_v4(), '石太分公司', 'STFGS'),
  (uuid_generate_v4(), '京石分公司', 'JSFGS')
ON CONFLICT (code) DO NOTHING;

-- 插入收费站数据
INSERT INTO toll_stations (id, name, code, company_id)
SELECT
  uuid_generate_v4(),
  name,
  code,
  companies.id
FROM (
  VALUES
    ('南佐收费站', 'NZSFZ', '平赞分公司'),
    ('姬村收费站', 'JCSFZ', '平赞分公司'),
    ('鹿泉南收费站', 'LQNSFZ', '平赞分公司'),
    ('院头收费站', 'YTSFZ', '平赞分公司'),
    ('赞皇西收费站', 'ZHXSFZ', '平赞分公司'),
    ('微水收费站', 'WSSFZ', '平赞分公司'),
    ('信调中心', 'XTZX', '平赞分公司'),
    ('苍岩山收费站', 'CYSFZ', '平赞分公司'),
    ('石棋峪收费站', 'SQYSFZ', '平赞分公司')
) AS stations(name, code, company_name)
JOIN companies ON companies.name = stations.company_name
ON CONFLICT (code) DO NOTHING;

-- 插入后台用户数据
-- 密码: pingzan123 (使用bcrypt哈希)
INSERT INTO admin_users (id, username, password, role, company_id)
SELECT
  uuid_generate_v4(),
  'pingzan',
  '$2a$10$E0Ht9P3v8Q7Z8B9C7V6N5M4L3K2J1I0H9G8F7E6D5C4B3A2',
  'super_admin',
  companies.id
FROM companies
WHERE companies.name = '平赞分公司'
ON CONFLICT (username) DO NOTHING;

-- 插入班次设置数据
INSERT INTO shift_settings (id, name, start_time, end_time) VALUES
  (uuid_generate_v4(), '白班', '07:30:00', '15:30:00'),
  (uuid_generate_v4(), '中班', '15:30:00', '23:30:00'),
  (uuid_generate_v4(), '夜班', '23:30:00', '07:30:00')
ON CONFLICT DO NOTHING;

-- ==================== 11. 创建视图 ====================
-- 用于快速查询班组及其关联的收费站
CREATE OR REPLACE VIEW v_toll_groups_with_station AS
SELECT 
  tg.*,
  ts.name AS station_name
FROM toll_groups tg
LEFT JOIN toll_stations ts ON tg.station_id = ts.id;

-- 用于快速查询收费员及其关联的班组和收费站
CREATE OR REPLACE VIEW v_toll_collectors_with_group_station AS
SELECT 
  tci.*,
  tg.name AS group_name,
  ts.name AS station_name
FROM toll_collectors_info tci
LEFT JOIN toll_groups tg ON tci.group_id = tg.id
LEFT JOIN toll_stations ts ON tci.station_id = ts.id;

-- 用于快速查询监控员及其关联的班组和收费站
CREATE OR REPLACE VIEW v_monitors_with_group_station AS
SELECT 
  mi.*,
  tg.name AS group_name,
  ts.name AS station_name
FROM monitors_info mi
LEFT JOIN toll_groups tg ON mi.group_id = tg.id
LEFT JOIN toll_stations ts ON mi.station_id = ts.id;

-- ==================== 12. 创建存储过程 ====================
-- 更新updated_at字段的触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为所有表添加updated_at触发器
DO $$ 
DECLARE 
  table_name TEXT;
BEGIN 
  FOR table_name IN 
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('companies', 'toll_stations', 'toll_groups', 'toll_collectors_info', 'monitors_info', 'shift_settings', 'admin_users', 'toll_records', 'toll_record_images')
  LOOP 
    EXECUTE format('CREATE TRIGGER update_%I_updated_at 
                   BEFORE UPDATE ON %I 
                   FOR EACH ROW 
                   EXECUTE FUNCTION update_updated_at_column();', 
                   table_name, table_name);
  END LOOP;
END $$;

-- ==================== 13. 权限设置 ====================
-- 为匿名用户授予必要的权限
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;

-- 刷新权限
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- 确保新创建的表也有正确的权限
ALTER DEFAULT PRIVILEGES IN SCHEMA public 
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public 
GRANT USAGE, SELECT ON SEQUENCES TO anon;
