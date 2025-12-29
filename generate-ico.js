const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sourceImage = path.join(__dirname, 'processed_icons', 'app-icon.png');
const outputDir = path.join(__dirname, 'processed_icons');

async function generateCorrectIco() {
    console.log('开始生成正确的ICO文件...');
    
    try {
        // 读取现有的PNG文件
        if (!fs.existsSync(sourceImage)) {
            throw new Error('源文件不存在: ' + sourceImage);
        }
        
        // 生成16x16的PNG
        const png16 = await sharp(sourceImage)
            .resize(16, 16, {
                fit: 'cover',
                position: 'center',
                kernel: 'lanczos3'
            })
            .png()
            .toBuffer();
        
        // 生成32x32的PNG
        const png32 = await sharp(sourceImage)
            .resize(32, 32, {
                fit: 'cover',
                position: 'center',
                kernel: 'lanczos3'
            })
            .png()
            .toBuffer();
        
        // 生成48x48的PNG
        const png48 = await sharp(sourceImage)
            .resize(48, 48, {
                fit: 'cover',
                position: 'center',
                kernel: 'lanczos3'
            })
            .png()
            .toBuffer();
        
        // 使用更可靠的方法创建ICO文件
        const icoPath = path.join(outputDir, 'favicon.ico');
        const icoBuffer = createIcoBuffer([png16, png32, png48]);
        fs.writeFileSync(icoPath, icoBuffer);
        
        console.log('✓ 生成 favicon.ico');
        console.log('\n✅ ICO文件生成完成！');
        
    } catch (error) {
        console.error('生成失败:', error);
        process.exit(1);
    }
}

// 创建ICO文件缓冲区
function createIcoBuffer(pngBuffers) {
    const numImages = pngBuffers.length;
    const headerSize = 6;
    const dirEntrySize = 16;
    const dataOffset = headerSize + dirEntrySize * numImages;
    
    // ICO文件头
    const header = Buffer.alloc(6);
    header.writeUInt16LE(0, 0); // Reserved
    header.writeUInt16LE(1, 2); // Type: 1 = ICO
    header.writeUInt16LE(numImages, 4); // Number of images
    
    // 目录条目
    const dirEntries = [];
    let currentOffset = dataOffset;
    
    for (let i = 0; i < pngBuffers.length; i++) {
        const png = pngBuffers[i];
        const size = Math.sqrt(png.length);
        const entry = Buffer.alloc(16);
        
        entry.writeUInt8(Math.min(size, 255), 0); // Width
        entry.writeUInt8(Math.min(size, 255), 1); // Height
        entry.writeUInt8(0, 2); // Color palette
        entry.writeUInt8(0, 3); // Reserved
        entry.writeUInt16LE(1, 4); // Color planes
        entry.writeUInt16LE(32, 6); // Bits per pixel
        entry.writeUInt32LE(png.length, 8); // Size of image data
        entry.writeUInt32LE(currentOffset, 12); // Offset
        
        dirEntries.push(entry);
        currentOffset += png.length;
    }
    
    // 合并所有部分
    return Buffer.concat([header, ...dirEntries, ...pngBuffers]);
}

generateCorrectIco();
