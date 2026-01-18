import Taro from '@tarojs/taro'
import {supabase} from '@/client/supabase'

/**
 * 将文件上传到 Supabase Storage
 * @param localPath 本地临时文件路径
 * @param bucketName Supabase Storage 的存储桶名称（默认：toll-images）
 * @returns 返回上传后的文件公开URL
 */
export async function uploadImage(localPath: string, bucketName: string = 'toll-images'): Promise<string> {
  try {
    console.log(`开始上传图片，本地路径: ${localPath}, 存储桶: ${bucketName}`)

    // 1. 生成唯一的文件名
    const fileExtension = localPath.split('.').pop() || 'jpg'
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2)
    const fileName = `${timestamp}-${randomStr}.${fileExtension}`
    console.log(`生成文件名: ${fileName}`)

    // 2. 获取Supabase配置
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase配置缺失')
      return localPath
    }

    // 3. 构建Supabase Storage的上传URL
    const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucketName}/${fileName}?apikey=${supabaseKey}`
    console.log(`上传URL: ${uploadUrl}`)

    // 4. 使用Taro.uploadFile上传文件
    await new Promise<void>((resolve, reject) => {
      Taro.uploadFile({
        url: uploadUrl,
        filePath: localPath,
        name: 'file',
        method: 'POST',
        header: {
          'Content-Type': 'application/octet-stream',
          Authorization: `Bearer ${supabaseKey}`,
          apikey: supabaseKey
        },
        success: (res) => {
          console.log(`图片上传响应: ${res.statusCode}`, res.data)
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve()
          } else {
            reject(new Error(`上传失败，状态码: ${res.statusCode}`))
          }
        },
        fail: (err) => {
          console.error('图片上传失败:', err)
          reject(err)
        }
      })
    })

    // 5. 获取公开访问URL
    const {data: urlData} = supabase.storage.from(bucketName).getPublicUrl(fileName)
    const publicUrl = urlData.publicUrl
    console.log(`图片上传成功，公开URL: ${publicUrl}`)

    return publicUrl
  } catch (error) {
    console.error('图片上传处理失败:', error)
    Taro.showToast({
      title: '图片上传失败，请重试',
      icon: 'none'
    })
    // 即使上传失败，也返回本地路径作为备选
    return localPath
  }
}
