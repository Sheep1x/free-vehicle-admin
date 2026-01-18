import Taro from '@tarojs/taro'

// 将图片路径转换为base64格式
export const imageToBase64 = async (imagePath: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
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
    } catch {
      reject(new Error('图片处理失败'))
    }
  })
}

// 压缩图片
export function compressImage(imagePath: string, quality = 0.8): Promise<string> {
  return new Promise((resolve) => {
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
  })
}
