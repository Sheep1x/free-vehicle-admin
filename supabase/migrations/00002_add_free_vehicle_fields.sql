/*
# 添加免费车登记字段

1. 新增字段
    - `free_reason` (text) - 免费原因（紧急车/军警车/应急车/旅游包车）
    - `toll_collector` (text) - 收费员
    - `monitor` (text) - 监控员

2. 说明
    - 为toll_records表添加免费车登记相关字段
    - 支持记录免费通行原因和相关人员信息
*/

ALTER TABLE toll_records 
ADD COLUMN IF NOT EXISTS free_reason text,
ADD COLUMN IF NOT EXISTS toll_collector text,
ADD COLUMN IF NOT EXISTS monitor text;
