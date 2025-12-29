/**
 * 后台管理系统的配置文件
 * !! 此文件包含敏感信息，已添加到 .gitignore，请勿提交到代码库 !!
 */

// Supabase 配置
const SUPABASE_URL = 'https://codvnervcuxohwtxotpn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZHZuZXJ2Y3V4b2h3dHhvdHBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MTg0MjQsImV4cCI6MjA4MTA5NDQyNH0.FrxgBbqYWmlhrSKZPLtZzn1DMcVEwyGTHs4mKYUuUTQ';

// 确保全局变量可用
window.ADMIN_CONFIG = {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
};