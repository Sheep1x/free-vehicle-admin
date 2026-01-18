import Taro from '@tarojs/taro'
import {taroStorage} from './storage'

/**
 * 图片存储工具类
 * 用于管理本地图片存储，实现图片的本地缓存和读取
 */

// 本地图片存储的键名前缀
const LOCAL_IMAGE_PREFIX = 'local_image_'

/**
 * 将图片保存到本地存储
 * @param userId 用户ID
 * @param recordId 记录ID
 * @param imageUrl 图片URL
 * @param imagePath 本地图片路径
 */
export const saveImageToLocalStorage = async (
  userId: string,
  recordId: string,
  imageUrl: string,
  imagePath: string
): Promise<void> => {
  try {
    // 只有微信小程序环境下才保存本地图片
    if (Taro.getEnv() === Taro.ENV_TYPE.WEAPP) {
      const fs = Taro.getFileSystemManager()

      // 读取图片文件内容
      const fileContent = fs.readFileSync(imagePath, 'base64')

      // 保存到本地存储，使用用户ID+记录ID作为键，确保不同账号的图片隔离
      const storageKey = `${LOCAL_IMAGE_PREFIX}${userId}_${recordId}`
      await taroStorage.setItem(storageKey, fileContent)

      // 保存图片URL到记录映射，便于后续查找
      await taroStorage.setItem(`${LOCAL_IMAGE_PREFIX}${userId}_url_${imageUrl}`, recordId)

      console.log(`图片已保存到本地存储，用户ID: ${userId}，记录ID: ${recordId}`)
    }
  } catch (error) {
    console.error('保存图片到本地存储失败:', error)
  }
}

/**
 * 从本地存储读取图片
 * @param userId 用户ID
 * @param recordId 记录ID
 * @returns 本地图片的base64编码，如果不存在则返回null
 */
export const getImageFromLocalStorage = async (userId: string, recordId: string): Promise<string | null> => {
  try {
    // 只有微信小程序环境下才读取本地图片
    if (Taro.getEnv() === Taro.ENV_TYPE.WEAPP) {
      const storageKey = `${LOCAL_IMAGE_PREFIX}${userId}_${recordId}`
      const base64Data = await taroStorage.getItem(storageKey)
      if (base64Data) {
        console.log(`从本地存储读取图片成功，用户ID: ${userId}，记录ID: ${recordId}`)
        return `data:image/jpeg;base64,${base64Data}`
      }
    }
    return null
  } catch (error) {
    console.error('从本地存储读取图片失败:', error)
    return null
  }
}

/**
 * 从本地存储读取图片（通过图片URL）
 * @param userId 用户ID
 * @param imageUrl 图片URL
 * @returns 本地图片的base64编码，如果不存在则返回null
 */
export const getImageFromLocalStorageByUrl = async (userId: string, imageUrl: string): Promise<string | null> => {
  try {
    // 只有微信小程序环境下才读取本地图片
    if (Taro.getEnv() === Taro.ENV_TYPE.WEAPP) {
      // 查找URL对应的记录ID
      const recordId = await taroStorage.getItem(`${LOCAL_IMAGE_PREFIX}${userId}_url_${imageUrl}`)
      if (recordId) {
        // 通过记录ID读取图片
        return await getImageFromLocalStorage(userId, recordId)
      }
    }
    return null
  } catch (error) {
    console.error('通过URL从本地存储读取图片失败:', error)
    return null
  }
}

/**
 * 检查图片是否存在于本地存储
 * @param userId 用户ID
 * @param recordId 记录ID
 * @returns 如果存在则返回true，否则返回false
 */
export const isImageInLocalStorage = async (userId: string, recordId: string): Promise<boolean> => {
  const imageData = await getImageFromLocalStorage(userId, recordId)
  return imageData !== null
}

/**
 * 删除本地存储中的图片
 * @param userId 用户ID
 * @param recordId 记录ID
 */
export const deleteImageFromLocalStorage = async (userId: string, recordId: string): Promise<void> => {
  try {
    // 只有微信小程序环境下才删除本地图片
    if (Taro.getEnv() === Taro.ENV_TYPE.WEAPP) {
      const storageKey = `${LOCAL_IMAGE_PREFIX}${userId}_${recordId}`
      await taroStorage.removeItem(storageKey)
      console.log(`从本地存储删除图片成功，用户ID: ${userId}，记录ID: ${recordId}`)
    }
  } catch (error) {
    console.error('从本地存储删除图片失败:', error)
  }
}

/**
 * 清除当前用户所有本地存储的图片
 * @param userId 用户ID
 */
export const clearUserLocalImages = async (userId: string): Promise<void> => {
  try {
    // 只有微信小程序环境下才清除本地图片
    if (Taro.getEnv() === Taro.ENV_TYPE.WEAPP) {
      const keys = await Taro.getStorageInfoSync().keys
      for (const key of keys) {
        if (key.startsWith(`${LOCAL_IMAGE_PREFIX}${userId}_`)) {
          await taroStorage.removeItem(key)
        }
      }
      console.log(`已清除用户 ${userId} 的所有本地存储图片`)
    }
  } catch (error) {
    console.error('清除用户本地图片失败:', error)
  }
}

/**
 * 清除所有本地存储的图片
 */
export const clearAllLocalImages = async (): Promise<void> => {
  try {
    // 只有微信小程序环境下才清除本地图片
    if (Taro.getEnv() === Taro.ENV_TYPE.WEAPP) {
      const keys = await Taro.getStorageInfoSync().keys
      for (const key of keys) {
        if (key.startsWith(LOCAL_IMAGE_PREFIX)) {
          await taroStorage.removeItem(key)
        }
      }
      console.log('已清除所有本地存储的图片')
    }
  } catch (error) {
    console.error('清除本地图片失败:', error)
  }
}
