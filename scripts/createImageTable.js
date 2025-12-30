const { createClient } = require('@supabase/supabase-js');

// 从.env文件中获取Supabase配置
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Supabase URL and Anon Key must be provided in the .env file');
  process.exit(1);
}

// 初始化Supabase客户端
const supabase = createClient(supabaseUrl, supabaseKey);

// 创建toll_record_images表的SQL语句
const createTableSQL = `
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

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_toll_record_images_record_id ON toll_record_images(record_id);
CREATE INDEX IF NOT EXISTS idx_toll_record_images_created_at ON toll_record_images(created_at);
CREATE INDEX IF NOT EXISTS idx_toll_record_images_file_format ON toll_record_images(file_format);

-- 创建更新触发器函数（如果不存在）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    CREATE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  END IF;
END $$;

-- 创建触发器（如果不存在）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_toll_record_images_updated_at') THEN
    CREATE TRIGGER update_toll_record_images_updated_at 
    BEFORE UPDATE ON toll_record_images 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
`;

// 执行SQL语句
async function createImageTable() {
  try {
    console.log('开始创建toll_record_images表...');
    
    // 使用Supabase的REST API执行SQL语句
    // 注意：这种方法需要Supabase项目启用了PostgREST的SQL执行功能
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/execute_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey
      },
      body: JSON.stringify({ sql: createTableSQL })
    });
    
    if (!response.ok) {
      const error = await response.json();
      console.error('创建表失败:', error);
      return;
    }
    
    const result = await response.json();
    console.log('表创建成功:', result);
    
    // 验证表是否创建成功
    const { data, error } = await supabase.from('toll_record_images').select('*').limit(1);
    
    if (error) {
      console.error('验证表失败:', error);
      return;
    }
    
    console.log('✅ 表创建成功并验证通过！');
  } catch (error) {
    console.error('执行SQL时发生错误:', error);
  }
}

// 执行函数
createImageTable();
