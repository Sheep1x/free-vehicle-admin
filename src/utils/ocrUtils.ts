import {createChatDataHandler, sendChatStream} from 'miaoda-taro-utils/chatStream'

const APP_ID = process.env.TARO_APP_APP_ID || ''
const ENDPOINT = 'https://api-integrations.appmiaoda.com/app-84zvdc9gufwh/api-2jBYdN3A9Jyz/v2/chat/completions'

// OCR识别结果接口
export interface OCRResult {
  plateNumber?: string
  vehicleType?: string
  axleCount?: string
  tonnage?: string
  entryInfo?: string
  entryTime?: string
  amount?: number
}

// 从AI响应中提取车辆信息
function parseOCRResponse(content: string): OCRResult {
  const result: OCRResult = {}

  // 提取车牌号（包含颜色和号码，例如：蓝 鲁P233CV）
  // 匹配模式：车牌号：蓝 鲁P233CV 或 车牌：蓝鲁P233CV
  const plateMatch = content.match(
    /车牌[号]?[:：]?\s*([蓝黄绿白黑][\s]?[^\n，,。]+?)(?=\n|车型|轴|吨|入口|时间|金额|$)/i
  )
  if (plateMatch) {
    result.plateNumber = plateMatch[1].trim()
  } else {
    // 备用匹配：直接查找颜色+车牌号模式
    const altPlateMatch = content.match(
      /([蓝黄绿白黑][\s]?[A-Z京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领][A-Z0-9]{5,6})/i
    )
    if (altPlateMatch) {
      result.plateNumber = altPlateMatch[1].trim()
    }
  }

  // 提取车型（完整信息，如"一型 客车"）
  const vehicleTypeMatch = content.match(/车型[:：]?\s*([^\n，,。]+?)(?=\n|轴|吨|入口|时间|金额|$)/i)
  if (vehicleTypeMatch) {
    result.vehicleType = vehicleTypeMatch[1].trim()
  }

  // 提取轴数
  const axleMatch = content.match(/(\d+)\s*轴/i)
  if (axleMatch) {
    result.axleCount = `${axleMatch[1]}轴`
  }

  // 提取吨位
  const tonnageMatch = content.match(/([\d.]+)\s*吨/i)
  if (tonnageMatch) {
    result.tonnage = `${tonnageMatch[1]}吨`
  }

  // 提取入口信息
  const entryMatch = content.match(/入口[:：]?\s*([^\n]+?)(?=\n|时间|$)/i)
  if (entryMatch) {
    result.entryInfo = entryMatch[1].trim()
  }

  // 使用当前时间作为通行时间（识别时的时间）
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')
  result.entryTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`

  // 提取金额
  const amountMatch = content.match(/金额[:：]?\s*([\d.]+)\s*元/i) || content.match(/([\d.]+)\s*元/)
  if (amountMatch) {
    result.amount = Number.parseFloat(amountMatch[1])
  }

  return result
}

// 调用OCR识别API
export async function recognizeTollReceipt(
  base64Image: string,
  onProgress?: (content: string) => void
): Promise<OCRResult> {
  return new Promise((resolve, reject) => {
    let fullContent = ''

    const handleData = createChatDataHandler((content) => {
      fullContent = content
      if (onProgress) {
        onProgress(content)
      }
    })

    const {abort} = sendChatStream({
      endpoint: ENDPOINT,
      appId: APP_ID,
      messages: [
        {
          role: 'system',
          content:
            '你是一个专业的车辆信息识别助手，擅长从车辆信息图片中提取关键信息。请准确识别所有字段，特别注意车牌号要包含颜色和完整号码。'
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `请仔细识别这张车辆信息图片，提取以下信息：

1. 车牌号：必须包含车牌颜色和完整号码（例如：蓝 鲁P233CV，黄 京A12345）
   - 车牌颜色：蓝/黄/绿/白/黑
   - 车牌号码：完整的省份简称+字母+数字组合
   
2. 车型：车辆类型的完整描述（例如：一型 客车，二型 货车，三型 专项作业车）
   - 必须包含型号和车辆类型
   - 不要只提取型号，要提取完整的车型信息

3. 轴数：车辆轴数（例如：2轴，3轴）

4. 吨位：车辆吨位（例如：1.26吨，2.5吨）

5. 入口信息：包含站点编号、路段名称、站点名称（例如：[1313-1A02] 内蒙高速-河北段1 河北清河站）

6. 金额：通行费金额（例如：79.00元）

请严格按照以下格式输出，每个字段单独一行：
车牌号：[颜色] [完整车牌号]
车型：[完整车型信息，包含型号和类型]
轴数：[轴数]
吨位：[吨位]
入口：[入口信息]
金额：[金额]元

注意：
- 车牌号必须完整，包含颜色和号码，中间用空格分隔
- 车型必须完整，例如"一型 客车"而不是只有"一型"`
            },
            {
              type: 'image_url',
              image_url: {
                url: base64Image
              }
            }
          ]
        }
      ],
      onUpdate: handleData,
      onComplete: () => {
        const result = parseOCRResponse(fullContent)
        resolve(result)
      },
      onError: (error: Error) => {
        console.error('OCR识别出错:', error)
        reject(error)
      }
    })

    // 可以在需要时中止请求
    // abort()
  })
}
