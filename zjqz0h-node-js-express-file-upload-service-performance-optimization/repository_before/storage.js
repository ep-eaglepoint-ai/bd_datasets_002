const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const config = require('./config');

function ensureDirectories() {
    if (!fs.existsSync(config.uploadDir)) {
        fs.mkdirSync(config.uploadDir, { recursive: true });
    }
    if (!fs.existsSync(config.thumbnailDir)) {
        fs.mkdirSync(config.thumbnailDir, { recursive: true });
    }
}

function saveFile(buffer, filename) {
    ensureDirectories();
    const filePath = path.join(config.uploadDir, filename);
    fs.writeFileSync(filePath, buffer);
    return filePath;
}

function readFile(filename) {
    const filePath = path.join(config.uploadDir, filename);
    return fs.readFileSync(filePath);
}

function deleteFile(filename) {
    const filePath = path.join(config.uploadDir, filename);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
}

function generateThumbnail(filename) {
    const inputPath = path.join(config.uploadDir, filename);
    const outputFilename = `thumb_${filename}`;
    const outputPath = path.join(config.thumbnailDir, outputFilename);
    
    const imageBuffer = fs.readFileSync(inputPath);
    
    const thumbnailBuffer = sharp(imageBuffer)
        .resize(config.thumbnailSize.width, config.thumbnailSize.height, {
            fit: 'cover'
        })
        .toBuffer();
    
    fs.writeFileSync(outputPath, thumbnailBuffer);
    
    return outputFilename;
}

function resizeImage(buffer, width, height) {
    return sharp(buffer)
        .resize(width, height, { fit: 'inside' })
        .toBuffer();
}

function getFileStats(filename) {
    const filePath = path.join(config.uploadDir, filename);
    return fs.statSync(filePath);
}

function fileExists(filename) {
    const filePath = path.join(config.uploadDir, filename);
    return fs.existsSync(filePath);
}

module.exports = {
    ensureDirectories,
    saveFile,
    readFile,
    deleteFile,
    generateThumbnail,
    resizeImage,
    getFileStats,
    fileExists
};
