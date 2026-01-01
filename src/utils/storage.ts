import Taro from '@tarojs/taro'

export const taroStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      const value = await Taro.getStorage({key})
      return value.data || null
    } catch (error) {
      console.error('读取存储失败:', error)
      return null
    }
  },

  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await Taro.setStorage({key, data: value})
    } catch (error) {
      console.error('写入存储失败:', error)
    }
  },

  removeItem: async (key: string): Promise<void> => {
    try {
      await Taro.removeStorage({key})
    } catch (error) {
      console.error('删除存储失败:', error)
    }
  },

  clear: async (): Promise<void> => {
    try {
      await Taro.clearStorage()
    } catch (error) {
      console.error('清空存储失败:', error)
    }
  }
}
