import Taro from '@tarojs/taro'

// 将图片路径转换为base64格式
export const imageToBase64 = async (imagePath: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      if (Taro.getEnv() === Taro.ENV_TYPE.WEAPP) {
        // 小程序环境
        const fs = Taro.getFileSystemManager()
        fs.readFile({
          filePath: imagePath,
          encoding: 'base64',
          success: (res) => {
            const extension = imagePath.split('.').pop()?.toLowerCase()
            const mimeTypeMap = {
              png: 'image/png',
              jpg: 'image/jpeg',
              jpeg: 'image/jpeg',
              gif: 'image/gif',
              webp: 'image/webp',
              bmp: 'image/bmp'
            }
            const mimeType = mimeTypeMap[extension] || 'image/jpeg'
            const base64String = `data:${mimeType};base64,${res.data}`
            resolve(base64String)
          },
          fail: () => {
            reject(new Error('图片转换失败'))
          }
        })
      } else {
        // H5环境
        if (imagePath.startsWith('data:')) {
          // 已经是base64格式
          resolve(imagePath)
          return
        }
        const img = new Image()
        img.crossOrigin = 'anonymous' // 处理跨域问题
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')
            canvas.width = img.width
            canvas.height = img.height
            ctx.drawImage(img, 0, 0)
            const base64String = canvas.toDataURL('image/jpeg', 0.8)
            resolve(base64String)
          } catch {
            reject(new Error('图片处理失败'))
          }
        }
        img.onerror = () => {
          reject(new Error('图片加载失败'))
        }
        img.src = imagePath
      }
    } catch {
      reject(new Error('图片处理失败'))
    }
  })
}

// 压缩图片
export function compressImage(imagePath: string, quality = 0.8): Promise<string> {
  return new Promise((resolve) => {
    if (Taro.getEnv() === Taro.ENV_TYPE.WEB) {
      // H5环境
      resolve(imagePath)
    } else {
      // 小程序环境
      Taro.compressImage({
        src: imagePath,
        quality: quality * 100, // 0-100
        success: (res) => {
          resolve(res.tempFilePath)
        },
        fail: () => {
          // 压缩失败时使用原图
          resolve(imagePath)
        }
      })
    }
  })
}
