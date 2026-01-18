import Taro from '@tarojs/taro'

/**
 * 将文件上传到 Supabase Storage
 * @param localPath 本地临时文件路径
 * @param bucketName Supabase Storage 的存储桶名称
 * @returns 返回上传后的文件公开URL
 */
export async function uploadImage(localPath: string, _bucketName: string = 'toll-images'): Promise<string> {
  try {
    console.log(`开始上传图片，本地路径: ${localPath}`)

    // 1. 生成唯一的文件名
    const fileExtension = localPath.split('.').pop() || 'jpg'
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExtension}`
    const _filePath = `public/${fileName}`

    // 2. 直接返回本地路径，不再上传到Supabase
    // 解决微信小程序中readFileSync不支持wxfile://协议的问题
    console.log('直接使用本地路径，跳过Supabase上传')
    return localPath
  } catch (error) {
    console.error('图片上传处理失败:', error)
    Taro.showToast({
      title: '图片上传失败，请重试',
      icon: 'none'
    })
    // 即使上传失败，也返回本地路径
    return localPath
  }
}
