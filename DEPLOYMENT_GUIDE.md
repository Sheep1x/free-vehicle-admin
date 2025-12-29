# 服务器部署指南

## 服务器信息
- **服务器地址**: 101.42.21.146
- **用户名**: root
- **密码**: Yyx19960517
- **部署目录**: /var/www/html/

## 部署文件
已生成 `dist-admin.zip` 压缩包，包含以下内容：
- index.html
- style.css
- admin.js
- auth.js
- collectors.js
- common.js
- companies.js
- config.js
- groups.js
- monitors.js
- records.js
- shifts.js
- stations.js
- users.js
- utils.js
- favicon.ico
- favicon-512x512.png
- app-icon.png
- app-icon-rounded.png
- logo.png

## 部署方法

### 方法1: 使用WinSCP（推荐）
1. 下载并安装 WinSCP: https://winscp.net/
2. 打开 WinSCP，输入以下信息：
   - 文件协议: SFTP
   - 主机名: 101.42.21.146
   - 端口: 22
   - 用户名: root
   - 密码: Yyx19960517
3. 连接后，将 `dist-admin.zip` 上传到 `/var/www/html/` 目录
4. 上传完成后，在服务器上解压：
   ```bash
   cd /var/www/html/
   unzip -o dist-admin.zip
   ```

### 方法2: 使用FileZilla
1. 下载并安装 FileZilla: https://filezilla-project.org/
2. 打开 FileZilla，输入以下信息：
   - 主机: 101.42.21.146
   - 用户: root
   - 密码: Yyx19960517
   - 端口: 22
3. 连接后，将 `dist-admin.zip` 上传到 `/var/www/html/` 目录
4. 上传完成后，在服务器上解压：
   ```bash
   cd /var/www/html/
   unzip -o dist-admin.zip
   ```

### 方法3: 使用命令行SCP
在本地打开PowerShell，执行以下命令：
```powershell
scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o BatchMode=yes dist-admin.zip root@101.42.21.146:/var/www/html/
```

## 服务器配置

上传并解压后，需要确保：
1. 文件权限正确
2. Web服务器（如Nginx/Apache）配置正确
3. 如果使用Nginx，确保配置指向 `/var/www/html/` 目录

## 访问地址
部署完成后，可以通过以下地址访问：
- http://101.42.21.146/
- http://101.42.21.146/index.html

## 注意事项
- 确保服务器防火墙允许HTTP/HTTPS访问（端口80/443）
- 建议在部署前备份原有文件
- 部署后测试所有功能是否正常
