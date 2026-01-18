import type {UserConfigExport} from '@tarojs/cli'

export default {
  mini: {
    webpackChain: (chain) => {
      // 代码分割
      chain.optimization.splitChunks({
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendor',
            chunks: 'initial',
            priority: 10
          },
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'initial',
            priority: 5,
            reuseExistingChunk: true
          }
        }
      })
      
      // 压缩配置
      chain.optimization.minimize(true)
      chain.optimization.minimizer('terser').use(require('terser-webpack-plugin'), [{
        terserOptions: {
          compress: {
            drop_console: true,
            drop_debugger: true
          },
          output: {
            comments: false
          }
        }
      }])
    }
  },
  compiler: {
    type: 'vite',
    viteConfig: {
      build: {
        minify: 'terser',
        terserOptions: {
          compress: {
            drop_console: true,
            drop_debugger: true
          },
          output: {
            comments: false
          }
        },
        rollupOptions: {
          output: {
            manualChunks: {
              taro: ['@tarojs/taro', '@tarojs/runtime'],
              react: ['react', 'react-dom'],
              supabase: ['supabase-wechat-js'],
              zustand: ['zustand']
            }
          }
        }
      }
    }
  }
} satisfies UserConfigExport<'vite'>
