const axios = require('axios');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const { Readable } = require('stream');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { promisify } = require('util');

class UploadEmbeddingLogic {

    constructor(googleEmbeddingService, pineconeUploadService) {
        this.googleEmbeddingService = googleEmbeddingService;
        this.pineconeUploadService = pineconeUploadService;
    }

    async createAndUploadEmbedding(reqCtx) {
        const {videoUrl, metaData} = reqCtx;
        const base64EncodedVideo = await this.fetchBase64Video(videoUrl);

        const videoEmbedding = await this.googleEmbeddingService.generateEmbeddings(base64EncodedVideo);
        const payload = {
            embedding: videoEmbedding.predictions[0].videoEmbeddings[0].embedding,
            metaData: metaData
        }
        return await this.pineconeUploadService.uploadEmbedding(payload);
    }

    async fetchBase64Video (videoUrl) {
        const response  = await axios({
            method: 'get',
            url: videoUrl,
            responseType: 'arraybuffer'
        });
        const buffer = Buffer.from(response.data, 'binary');
        return await this.truncateVideo(buffer, 10);
    }

    async truncateVideo(buffer, duration = 10){
        const writeFileAsync = promisify(fs.writeFile);
        const readFileAsync = promisify(fs.readFile);
        const unlinkAsync = promisify(fs.unlink);

        const inputPath = path.join(os.tmpdir(), `input_${Date.now()}.mp4`);
        const outputPath = path.join(os.tmpdir(), `output_${Date.now()}.mp4`);

        try {
            // Write the buffer to a temporary file
            await writeFileAsync(inputPath, buffer);

            return new Promise((resolve, reject) => {
                ffmpeg(inputPath)
                    .setStartTime(0)
                    .duration(duration)
                    .output(outputPath)
                    .on('end', async () => {
                        try {
                            const truncatedBuffer = await readFileAsync(outputPath);
                            const base64String = truncatedBuffer.toString('base64');

                            // Clean up temporary files
                            await Promise.all([
                                unlinkAsync(inputPath),
                                unlinkAsync(outputPath)
                            ]);

                            resolve(base64String);
                        } catch (error) {
                            reject(error);
                        }
                    })
                    .on('error', (err) => {
                        reject(new Error(`FFmpeg error: ${err.message}`));
                    })
                    .run();
            });
        } catch (error) {
            throw new Error(`Error processing video: ${error.message}`);
        }
    }
}
 module.exports = UploadEmbeddingLogic;
