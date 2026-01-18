import Taro from '@tarojs/taro'

/**
 * 将文件上传到 Supabase Storage
 * @param localPath 本地临时文件路径
 * @param bucketName Supabase Storage 的存储桶名称
 * @returns 返回上传后的文件公开URL
 */
export async function uploadImage(localPath: string, bucketName: string = 'toll-images'): Promise<string> {
  try {
    console.log(`开始上传图片，本地路径: ${localPath}`)

    // 1. 生成唯一的文件名
    const fileExtension = localPath.split('.').pop() || 'jpg'
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExtension}`
    const filePath = `${fileName}`

    // 2. 获取Supabase配置
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase配置缺失')
      return localPath
    }

    // 3. 构建Supabase Storage的上传URL
    const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucketName}/${filePath}?apikey=${supabaseKey}`
    console.log('上传URL:', uploadUrl)

    // 4. 使用Taro.uploadFile上传文件
    const uploadResult = await new Promise<{ statusCode: number; data: string }>((resolve, reject) => {
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
          console.log('上传响应:', res)
          resolve(res)
        },
        fail: (err) => {
          console.error('上传失败:', err)
          reject(err)
        }
      })
    })

    // 检查上传状态
    if (uploadResult.statusCode >= 200 && uploadResult.statusCode < 300) {
      console.log('图片上传成功')

      // 5. 获取公开访问URL
      // Supabase Storage的公开URL格式
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucketName}/${filePath}`
      console.log('公开URL:', publicUrl)
      return publicUrl
    } else {
      console.error('上传失败，状态码:', uploadResult.statusCode)
      return localPath
    }
  } catch (error) {
    console.error('图片上传处理失败:', error)
    // 即使上传失败，也返回本地路径，由uploadRecordImage处理
    return localPath
  }
}
