import {createClient} from '@supabase/supabase-js'

// 从环境变量中获取 Supabase 配置
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

// 初始化 Supabase 客户端
// 添加必要的检查，确保环境变量已设置
if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase URL and Anon Key must be provided in the .env file')
}

export const supabase = createClient(supabaseUrl, supabaseKey)
