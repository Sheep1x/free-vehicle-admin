import Taro from '@tarojs/taro'

const CACHE_MAX_SIZE = 50 * 1024 * 1024
const CACHE_EXPIRY_TIME = 7 * 24 * 60 * 60 * 1000
const CACHE_VERSION = '2.1.0'

interface CacheMetadata {
  url: string
  localPath: string
  size: number
  createdAt: number
  expiresAt: number
  version: string
}

class ImageCacheManager {
  private static instance: ImageCacheManager
  private cacheDir: string
  private metadataKey = 'image_cache_metadata'
  private initialized = false

  private constructor() {
    this.cacheDir = `${Taro.env.USER_DATA_PATH}/image_cache`
  }

  static getInstance(): ImageCacheManager {
    if (!ImageCacheManager.instance) {
      ImageCacheManager.instance = new ImageCacheManager()
    }
    return ImageCacheManager.instance
  }

  async initialize(): Promise<void> {
    if (this.initialized) return

    try {
      await Taro.getStorageInfo()
      const {fileList: savedFiles} = await Taro.getSavedFileList()
      const totalSize = savedFiles.reduce((sum: number, file: {size: number}) => sum + file.size, 0)

      if (totalSize > CACHE_MAX_SIZE) {
        await this.cleanupExpiredCache()
      }
    } catch {
      console.warn('ImageCache: 初始化检查失败')
    }

    this.initialized = true
  }

  private getMetadata(): Record<string, CacheMetadata> {
    try {
      const metadata = Taro.getStorageSync(this.metadataKey)
      return metadata ? JSON.parse(metadata) : {}
    } catch {
      return {}
    }
  }

  private saveMetadata(metadata: Record<string, CacheMetadata>): void {
    try {
      Taro.setStorageSync(this.metadataKey, JSON.stringify(metadata))
    } catch {
      console.error('ImageCache: 保存元数据失败')
    }
  }

  private async getCacheKey(url: string): Promise<string> {
    const hash = await this.hashString(url)
    return `img_${hash}`
  }

  private async hashString(str: string): Promise<string> {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash
    }
    return Math.abs(hash).toString(36)
  }

  async getImage(url: string): Promise<string | null> {
    await this.initialize()

    try {
      const cacheKey = await this.getCacheKey(url)
      const metadata = this.getMetadata()
      const cacheInfo = metadata[cacheKey]

      if (cacheInfo) {
        const fs = Taro.getFileSystemManager()

        try {
          await fs.access(cacheInfo.localPath)

          if (Date.now() > cacheInfo.expiresAt || cacheInfo.version !== CACHE_VERSION) {
            await this.removeFromCache(cacheKey)
            return null
          }

          return cacheInfo.localPath
        } catch {
          await this.removeFromCache(cacheKey)
        }
      }
    } catch {
      console.error('ImageCache: 获取图片失败')
    }

    return null
  }

  async downloadAndCache(url: string): Promise<string | null> {
    await this.initialize()

    try {
      const cacheKey = await this.getCacheKey(url)
      const fs = Taro.getFileSystemManager()
      const localPath = `${this.cacheDir}/${cacheKey}`

      await new Promise<void>((resolve, reject) => {
        Taro.downloadFile({
          url,
          success: (res) => {
            if (res.statusCode === 200) {
              const {tempFilePath} = res

              fs.saveFile({
                tempFilePath,
                filePath: localPath,
                success: async () => {
                  try {
                    const fileInfo = await fs.getFileInfo({filePath: localPath})
                    const now = Date.now()

                    const metadata = this.getMetadata()
                    metadata[cacheKey] = {
                      url,
                      localPath,
                      size: fileInfo.size,
                      createdAt: now,
                      expiresAt: now + CACHE_EXPIRY_TIME,
                      version: CACHE_VERSION
                    }
                    this.saveMetadata(metadata)
                    resolve()
                  } catch {
                    reject(new Error('保存元数据失败'))
                  }
                },
                fail: (err) => {
                  reject(err)
                }
              })
            } else {
              reject(new Error(`下载失败，状态码: ${res.statusCode}`))
            }
          },
          fail: (err) => {
            reject(err)
          }
        })
      })

      return localPath
    } catch {
      return null
    }
  }

  async loadImage(url: string): Promise<string> {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return url
    }

    const localPath = await this.getImage(url)

    if (localPath) {
      return localPath
    }

    const downloadedPath = await this.downloadAndCache(url)

    if (downloadedPath) {
      return downloadedPath
    }

    return url
  }

  async removeFromCache(cacheKey: string): Promise<void> {
    try {
      const metadata = this.getMetadata()
      const cacheInfo = metadata[cacheKey]

      if (cacheInfo) {
        const fs = Taro.getFileSystemManager()

        try {
          await fs.access(cacheInfo.localPath)
          await fs.removeSavedFile({filePath: cacheInfo.localPath})
        } catch {
        }

        delete metadata[cacheKey]
        this.saveMetadata(metadata)
      }
    } catch {
      console.error('ImageCache: 从缓存移除失败')
    }
  }

  async clearAllCache(): Promise<void> {
    try {
      const metadata = this.getMetadata()
      const fs = Taro.getFileSystemManager()

      for (const cacheKey of Object.keys(metadata)) {
        const cacheInfo = metadata[cacheKey]

        try {
          await fs.access(cacheInfo.localPath)
          await fs.removeSavedFile({filePath: cacheInfo.localPath})
        } catch {
        }
      }

      Taro.removeStorageSync(this.metadataKey)
    } catch {
      console.error('ImageCache: 清除缓存失败')
    }
  }

  async cleanupExpiredCache(): Promise<void> {
    try {
      const metadata = this.getMetadata()
      const now = Date.now()
      let totalSize = 0
      const validCache: Record<string, CacheMetadata> = {}

      for (const [cacheKey, cacheInfo] of Object.entries(metadata)) {
        if (now > cacheInfo.expiresAt || cacheInfo.version !== CACHE_VERSION) {
          try {
            const fs = Taro.getFileSystemManager()
            await fs.access(cacheInfo.localPath)
            await fs.removeSavedFile({filePath: cacheInfo.localPath})
          } catch {
          }
        } else {
          totalSize += cacheInfo.size
          validCache[cacheKey] = cacheInfo
        }
      }

      if (totalSize > CACHE_MAX_SIZE) {
        const sortedCache = Object.entries(validCache)
          .sort(([, a], [, b]) => a.createdAt - b.createdAt)
          .slice(0, Math.floor(Object.keys(validCache).length * 0.7))

        for (const [cacheKey] of sortedCache) {
          const cacheInfo = validCache[cacheKey]
          try {
            const fs = Taro.getFileSystemManager()
            await fs.access(cacheInfo.localPath)
            await fs.removeSavedFile({filePath: cacheInfo.localPath})
          } catch {
          }
          delete validCache[cacheKey]
          totalSize -= cacheInfo.size

          if (totalSize <= CACHE_MAX_SIZE * 0.7) break
        }
      }

      this.saveMetadata(validCache)
    } catch {
      console.error('ImageCache: 清理缓存失败')
    }
  }

  async getCacheSize(): Promise<number> {
    try {
      const metadata = this.getMetadata()
      return Object.values(metadata).reduce((sum, info) => sum + info.size, 0)
    } catch {
      return 0
    }
  }

  async getCacheCount(): Promise<number> {
    try {
      const metadata = this.getMetadata()
      return Object.keys(metadata).length
    } catch {
      return 0
    }
  }

  getVersion(): string {
    return CACHE_VERSION
  }
}

export const imageCacheManager = ImageCacheManager.getInstance()

export async function loadImageWithCache(url: string): Promise<string> {
  return imageCacheManager.loadImage(url)
}

export async function preloadImages(urls: string[]): Promise<void> {
  const promises = urls.map((url) =>
    imageCacheManager.loadImage(url).catch(() => {})
  )
  await Promise.all(promises)
}

export async function clearAllImageCache(): Promise<void> {
  await imageCacheManager.clearAllCache()
}

export async function cleanupExpiredImageCache(): Promise<void> {
  await imageCacheManager.cleanupExpiredCache()
}

export function getImageCacheVersion(): string {
  return imageCacheManager.getVersion()
}
