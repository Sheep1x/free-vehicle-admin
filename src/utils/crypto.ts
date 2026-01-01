import CryptoJS from 'crypto-js'

const SECRET_KEY = 'free-vehicle-secret-key-2024'

// 加密密码
export function encryptPassword(password: string): string {
  try {
    const encrypted = CryptoJS.AES.encrypt(password, SECRET_KEY).toString()
    return encrypted
  } catch (error) {
    console.error('密码加密失败:', error)
    return password
  }
}

// 解密密码
export function decryptPassword(encryptedPassword: string): string {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedPassword, SECRET_KEY)
    const decrypted = bytes.toString(CryptoJS.enc.Utf8)
    return decrypted
  } catch (error) {
    console.error('密码解密失败:', error)
    return encryptedPassword
  }
}

// 生成随机盐值
export function generateSalt(): string {
  return CryptoJS.lib.WordArray.random(16).toString()
}

// 使用盐值加密密码
export function encryptPasswordWithSalt(password: string, salt: string): string {
  try {
    const saltedPassword = password + salt
    const encrypted = CryptoJS.AES.encrypt(saltedPassword, SECRET_KEY).toString()
    return encrypted
  } catch (error) {
    console.error('密码加密失败:', error)
    return password
  }
}

// 使用盐值解密密码
export function decryptPasswordWithSalt(encryptedPassword: string, salt: string): string {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedPassword, SECRET_KEY)
    const decrypted = bytes.toString(CryptoJS.enc.Utf8)
    return decrypted.replace(salt, '')
  } catch (error) {
    console.error('密码解密失败:', error)
    return encryptedPassword
  }
}

// 生成哈希值
export function hashPassword(password: string): string {
  try {
    const hash = CryptoJS.SHA256(password).toString()
    return hash
  } catch (error) {
    console.error('密码哈希失败:', error)
    return password
  }
}

// 生成会话令牌
export function generateSessionToken(userId: string): string {
  const timestamp = Date.now()
  const data = `${userId}-${timestamp}`
  const hash = CryptoJS.SHA256(data).toString()
  return hash
}

// 验证会话令牌
export function validateSessionToken(token: string, userId: string): boolean {
  const hash = CryptoJS.SHA256(userId).toString()
  return token === hash
}
