// EdgeOne 部署配置文件
module.exports = {
  // 项目配置
  project: {
    name: 'free-vehicle-admin',
    description: '免费车登记后台管理系统',
    version: '1.0.0'
  },
  
  // 部署配置
  deploy: {
    // 源文件目录
    sourceDir: 'admin',
    
    // 构建输出目录
    outputDir: 'dist-admin',
    
    // 忽略文件
    ignore: [
      'node_modules/**',
      '.git/**',
      '*.log',
      '.DS_Store'
    ],
    
    // 环境变量配置
    env: {
      // 从 .env 文件读取的环境变量
      SUPABASE_URL: process.env.TARO_APP_SUPABASE_URL || 'https://codvnervcuxohwtxotpn.supabase.co',
      SUPABASE_ANON_KEY: process.env.TARO_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZHZuZXJ2Y3V4b2h3dHhvdHBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MTg0MjQsImV4cCI6MjA4MTA5NDQyNH0.FrxgBbqYWmlhrSKZPLtZzn1DMcVEwyGTHs4mKYUuUTQ',
      APP_NAME: process.env.TARO_APP_NAME || '免费车登记'
    },
    
    // 自定义域名配置（可选）
    domain: {
      // 是否启用自定义域名
      enabled: false,
      // 自定义域名
      customDomain: '',
      // HTTPS证书
      ssl: true
    },
    
    // CDN配置
    cdn: {
      // 缓存策略
      cache: {
        // 静态资源缓存时间（秒）
        staticMaxAge: 31536000, // 1年
        // HTML文件缓存时间（秒）
        htmlMaxAge: 0, // 不缓存
        // 缓存规则
        rules: [
          {
            pattern: '**/*.html',
            cacheControl: 'no-cache, no-store, must-revalidate'
          },
          {
            pattern: '**/*.js',
            cacheControl: 'public, max-age=31536000, immutable'
          },
          {
            pattern: '**/*.css',
            cacheControl: 'public, max-age=31536000, immutable'
          },
          {
            pattern: '**/*.{png,jpg,jpeg,gif,ico,svg}',
            cacheControl: 'public, max-age=31536000, immutable'
          }
        ]
      },
      
      // 压缩配置
      compression: {
        gzip: true,
        brotli: true
      },
      
      // 安全头配置
      security: {
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin'
      }
    },
    
    // 边缘函数配置
    edgeFunctions: {
      // 是否启用边缘函数
      enabled: true,
      // 边缘函数目录
      functionsDir: 'edge-functions',
      // 路由配置
      routes: [
        {
          pattern: '/api/*',
          function: 'api-handler'
        }
      ]
    }
  }
};