/*
============== INITIAL DATABASE SCHEMA ==============

This file contains the consolidated and corrected initial schema for the application.
It combines and fixes issues from the following old migration files:

- 00001_create_toll_records_table.sql
- 00002_add_free_vehicle_fields.sql (Incorrect data types)
- 00003_create_admin_management_tables.sql
- 00004_add_group_id_to_monitors.sql
- 00005_add_company_management.sql (Redundant)
- 00005_complete_company_management.sql (Duplicate)
- 20251216135749_create_admin_users.sql (Insecure default password)

==================================================
*/

-- 1. Companies Table
CREATE TABLE IF NOT EXISTS companies (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    code text UNIQUE NOT NULL,
    created_at timestamptz DEFAULT now()
);
COMMENT ON TABLE companies IS '分公司信息表，用于管理收费站的上级分公司';

-- 2. Toll Stations Table
CREATE TABLE IF NOT EXISTS toll_stations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
    name text NOT NULL,
    code text UNIQUE NOT NULL,
    created_at timestamptz DEFAULT now()
);
COMMENT ON TABLE toll_stations IS '收费站信息表';
COMMENT ON COLUMN toll_stations.company_id IS '所属分公司ID，外键关联companies表';

-- 3. Toll Groups Table
CREATE TABLE IF NOT EXISTS toll_groups (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id uuid REFERENCES toll_stations(id) ON DELETE CASCADE,
    name text NOT NULL,
    code text UNIQUE NOT NULL,
    created_at timestamptz DEFAULT now()
);
COMMENT ON TABLE toll_groups IS '收费班组信息表';

-- 4. Toll Collectors Info Table
CREATE TABLE IF NOT EXISTS toll_collectors_info (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    code text UNIQUE NOT NULL,
    group_id uuid REFERENCES toll_groups(id) ON DELETE SET NULL,
    station_id uuid REFERENCES toll_stations(id) ON DELETE SET NULL, -- Added for consistency
    created_at timestamptz DEFAULT now()
);
COMMENT ON TABLE toll_collectors_info IS '收费员信息表';


-- 5. Monitors Info Table
CREATE TABLE IF NOT EXISTS monitors_info (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    code text UNIQUE NOT NULL,
    station_id uuid REFERENCES toll_stations(id) ON DELETE SET NULL,
    group_id uuid REFERENCES toll_groups(id) ON DELETE SET NULL, -- From migration 00004
    created_at timestamptz DEFAULT now()
);
COMMENT ON TABLE monitors_info IS '监控员信息表';

-- 6. Shift Settings Table
CREATE TABLE IF NOT EXISTS shift_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_name text NOT NULL UNIQUE,
    start_time time NOT NULL,
    end_time time NOT NULL,
    created_at timestamptz DEFAULT now()
);
COMMENT ON TABLE shift_settings IS '班次时间设置表';

-- 7. Toll Records Table (with corrected FKs)
CREATE TABLE IF NOT EXISTS toll_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plate_number text,
  vehicle_type text,
  axle_count text,
  tonnage text,
  entry_info text,
  entry_time timestamptz,
  amount numeric(10, 2),
  image_url text,
  created_at timestamptz DEFAULT now(),
  -- Corrected fields from text to foreign keys
  free_reason text,
  collector_id uuid REFERENCES toll_collectors_info(id) ON DELETE SET NULL,
  monitor_id uuid REFERENCES monitors_info(id) ON DELETE SET NULL,
  station_id uuid REFERENCES toll_stations(id) ON DELETE SET NULL -- Added for better filtering
);
COMMENT ON TABLE toll_records IS '车辆通行费票据识别记录表';
COMMENT ON COLUMN toll_records.collector_id IS '收费员ID';
COMMENT ON COLUMN toll_records.monitor_id IS '监控员ID';
COMMENT ON COLUMN toll_records.station_id IS '收费站ID';

-- 8. Admin Users Table (without insecure password)
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL, -- Password should be hashed by the application
  role VARCHAR(20) NOT NULL CHECK (role IN ('super_admin', 'company_admin', 'station_admin')),
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  station_id UUID REFERENCES toll_stations(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
COMMENT ON TABLE admin_users IS '后台管理用户表';
COMMENT ON COLUMN admin_users.password IS '密码应由应用程序进行哈希处理后存储';

-- 9. Insert Default Data

-- Default shift settings
INSERT INTO shift_settings (shift_name, start_time, end_time) VALUES
    ('白班', '07:30:00', '15:30:00'),
    ('中班', '15:30:00', '23:30:00'),
    ('夜班', '23:30:00', '07:30:00')
ON CONFLICT (shift_name) DO NOTHING;

-- It is recommended to add default companies via the application UI or a secure script,
-- but a default can be useful for development.
INSERT INTO companies (name, code) VALUES
    ('默认公司', 'DEFAULT')
ON CONFLICT (code) DO NOTHING;

-- 10. Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_toll_records_plate_number ON toll_records(plate_number);
CREATE INDEX IF NOT EXISTS idx_toll_records_created_at ON toll_records(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_toll_records_collector ON toll_records(collector_id);
CREATE INDEX IF NOT EXISTS idx_toll_records_monitor ON toll_records(monitor_id);
CREATE INDEX IF NOT EXISTS idx_toll_records_station ON toll_records(station_id);

CREATE INDEX IF NOT EXISTS idx_toll_stations_company ON toll_stations(company_id);
CREATE INDEX IF NOT EXISTS idx_toll_groups_station ON toll_groups(station_id);
CREATE INDEX IF NOT EXISTS idx_toll_collectors_group ON toll_collectors_info(group_id);
CREATE INDEX IF NOT EXISTS idx_toll_collectors_station ON toll_collectors_info(station_id);
CREATE INDEX IF NOT EXISTS idx_monitors_station ON monitors_info(station_id);
CREATE INDEX IF NOT EXISTS idx_monitors_group ON monitors_info(group_id);

CREATE INDEX IF NOT EXISTS idx_admin_users_company ON admin_users(company_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_station ON admin_users(station_id);
