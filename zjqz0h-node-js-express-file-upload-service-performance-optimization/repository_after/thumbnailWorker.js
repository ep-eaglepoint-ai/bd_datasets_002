const { parentPort } = require('worker_threads');
const sharp = require('sharp');
const path = require('path');
const config = require('./config');

parentPort.on('message', async (task) => {
    try {
        const { filename, thumbnailFilename } = task;
        const inputPath = path.join(config.uploadDir, filename);
        const outputPath = path.join(config.thumbnailDir, thumbnailFilename);

        await sharp(inputPath)
            .resize(config.thumbnailSize.width, config.thumbnailSize.height, {
                fit: 'cover'
            })
            .toFile(outputPath);

        parentPort.postMessage({ status: 'done', filename, thumbnailFilename });
    } catch (error) {
        console.error('Thumbnail worker error:', error);
        parentPort.postMessage({ status: 'error', error: error.message });
    }
});
