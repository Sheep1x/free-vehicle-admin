import path from 'node:path'
import {defineConfig, type UserConfigExport} from '@tarojs/cli'
import {miaodaDevPlugin} from 'miaoda-sc-plugin'
import tailwindcss from 'tailwindcss'
import type {Plugin} from 'vite'
import {UnifiedViteWeappTailwindcssPlugin as uvtw} from 'weapp-tailwindcss/vite'

import devConfig from './dev'
import lintConfig from './lint'
import prodConfig from './prod'

const base = String(process.argv[process.argv.length - 1])
const publicPath = /^http/.test(base) ? base : '/'

// https://taro-docs.jd.com/docs/next/config#defineconfig-辅助函数
export default defineConfig<'vite'>(async (merge) => {
  const baseConfig: UserConfigExport<'vite'> = {
    projectName: 'taro-vite',
    date: '2025-8-25',
    designWidth: 375,
    deviceRatio: {
      640: 2.34 / 2,
      750: 1,
      375: 2,
      828: 1.81 / 2
    },
    sourceRoot: 'src',
    outputRoot: 'dist',
    plugins: ['@tarojs/plugin-generator'],
    alias: {
      '@': path.resolve(__dirname, '../src'),
      // 小程序场景使用微信polyfill版本supabase-js
      '@supabase/supabase-js': process.env.TARO_ENV === 'h5' ? '@supabase/supabase-js' : 'supabase-wechat-js'
    },
    defineConstants: {
      'process.env.TARO_APP_VITE_OCR_ENDPOINT': JSON.stringify(
        'https://api-integrations.appmiaoda.com/app-84zvdc9gufwh/api-2jBYdN3A9Jyz/v2/chat/completions'
      )
    },
    copy: {
      patterns: [
        {
          from: 'src/assets/images/app-icon-rounded.png',
          to: 'dist/assets/images/app-icon-rounded.png'
        }
      ],
      options: {}
    },
    framework: 'react',
    compiler: {
      type: 'vite',
      vitePlugins: [
        miaodaDevPlugin({appType: 'miniapp', cdnBase: publicPath}),

        {
          name: 'hmr-toggle',
          configureServer(server) {
            let hmrEnabled = true

            // 包装原来的 send 方法
            const _send = server.ws.send
            server.ws.send = (payload) => {
              if (hmrEnabled) {
                return _send.call(server.ws, payload)
              } else {
                console.log('[HMR disabled] skipped payload:', payload.type)
              }
            }

            // 提供接口切换 HMR
            server.middlewares.use('/innerapi/v1/sourcecode/__hmr_off', (_req, res) => {
              hmrEnabled = false
              const body = {
                status: 0,
                msg: 'HMR disabled'
              }
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify(body))
            })

            server.middlewares.use('/innerapi/v1/sourcecode/__hmr_on', (_req, res) => {
              hmrEnabled = true
              const body = {
                status: 0,
                msg: 'HMR enabled'
              }
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify(body))
            })

            // 注册一个 HTTP API，用来手动触发一次整体刷新
            server.middlewares.use('/innerapi/v1/sourcecode/__hmr_reload', (_req, res) => {
              if (hmrEnabled) {
                server.ws.send({
                  type: 'full-reload',
                  path: '*' // 整页刷新
                })
              }
              res.statusCode = 200
              const body = {
                status: 0,
                msg: 'Manual full reload triggered'
              }
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify(body))
            })
          },
          load(id) {
            if (id === 'virtual:after-update') {
              return `
        if (import.meta.hot) {
          import.meta.hot.on('vite:afterUpdate', () => {
            window.postMessage(
              {
                type: 'editor-update'
              },
              '*'
            );
          });
        }
      `
            }
          },
          transformIndexHtml(html) {
            return {
              html,
              tags: [
                {
                  tag: 'script',
                  attrs: {
                    type: 'module',
                    src: '/@id/virtual:after-update'
                  },
                  injectTo: 'body'
                }
              ]
            }
          }
        },

        {
          // 通过 vite 插件加载 postcss,
          name: 'postcss-config-loader-plugin',
          config(config) {
            // 加载 tailwindcss
            if (typeof config.css?.postcss === 'object') {
              config.css?.postcss.plugins?.unshift(tailwindcss())
            }
          }
        },
        uvtw({
          // rem转rpx
          rem2rpx: true,
          // 除了小程序这些，其他平台都 disable
          disabled: process.env.TARO_ENV === 'h5',
          // 由于 taro vite 默认会移除所有的 tailwindcss css 变量，所以一定要开启这个配置，进行css 变量的重新注入
          injectAdditionalCssVarScope: true
        })
      ] as Plugin[]
    },
    mini: {
      postcss: {
        pxtransform: {
          enable: true,
          config: {
            baseFontSize: 12,
            minRootSize: 12
          }
        },
        cssModules: {
          enable: false, // 默认为 false，如需使用 css modules 功能，则设为 true
          config: {
            namingPattern: 'module', // 转换模式，取值为 global/module
            generateScopedName: '[name]__[local]___[hash:base64:5]'
          }
        }
      }
    }
  }

  if (process.env.LINT_MODE === 'true') {
    return merge({}, baseConfig, lintConfig)
  }

  if (process.env.NODE_ENV === 'development') {
    // 本地开发构建配置（不混淆压缩）
    return merge({}, baseConfig, devConfig)
  }

  // 生产构建配置（默认开启压缩混淆等）
  return merge({}, baseConfig, prodConfig)
})
