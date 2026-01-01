1. **登录Supabase控制台**
   - 访问Supabase项目控制台
   - 进入"Table Editor"页面

2. **查看现有数据**
   - 查看`companies`表，获取现有分公司的ID和信息
   - 查看`companies`表中的记录，选择一个要关联的分公司

3. **为toll_stations添加数据**
   - 进入`toll_stations`表
   - 点击"Insert row"按钮
   - 填写必填字段：
     - `name`：收费站名称
     - `code`：收费站代码（必须唯一）
     - `company_id`：从`companies`表中选择的分公司ID
   - 点击"Save"保存

4. **为toll_collectors_info添加数据**
   - 进入`toll_collectors_info`表
   - 点击"Insert row"按钮
   - 填写必填字段：
     - `name`：收费员姓名
     - `code`：收费员代码（必须唯一）
     - `station_id`：从`toll_stations`表中选择的收费站ID
   - 可选填写`group_id`：如果有班组，可以关联到对应的班组
   - 点击"Save"保存

5. **验证数据关系**
   - 检查`toll_stations`表中的`company_id`是否正确关联到`companies`表
   - 检查`toll_collectors_info`表中的`station_id`是否正确关联到`toll_stations`表
   - 可以使用Supabase的"Relationships"视图查看表之间的关联关系

6. **数据查询验证**
   - 使用SQL编辑器运行查询，验证数据是否正确添加：
     ```sql
     -- 查询收费站及其所属分公司
     SELECT ts.id, ts.name AS station_name, ts.code AS station_code, c.name AS company_name 
     FROM toll_stations ts 
     JOIN companies c ON ts.company_id = c.id;
     
     -- 查询收费员及其所属收费站
     SELECT tci.id, tci.name AS collector_name, tci.code AS collector_code, ts.name AS station_name 
     FROM toll_collectors_info tci 
     JOIN toll_stations ts ON tci.station_id = ts.id;
     ```

通过以上步骤，您可以成功为toll_stations添加属于companies的分公司数据，并为toll_collectors_info添加属于toll_stations的收费站数据。