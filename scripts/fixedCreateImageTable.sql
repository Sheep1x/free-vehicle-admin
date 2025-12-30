-- 创建toll_record_images表
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

-- 创建更新触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
CREATE TRIGGER update_toll_record_images_updated_at 
BEFORE UPDATE ON toll_record_images 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();
