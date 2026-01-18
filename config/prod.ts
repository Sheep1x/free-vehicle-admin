import type {UserConfigExport} from '@tarojs/cli'

export default {
  mini: {
    webpackChain: (chain) => {
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
  }
} satisfies UserConfigExport<'vite'>
