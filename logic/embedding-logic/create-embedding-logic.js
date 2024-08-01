const _ = require('lodash');

class CreateEmbeddingLogic {
    constructor( googleEmbeddingService, pineconeUploadService, uploadEmbeddingLogic) {
        this.googleEmbeddingService = googleEmbeddingService;
        this.pineconeUploadService = pineconeUploadService;
        this.uploadEmbeddingLogic = uploadEmbeddingLogic;
    }

    async createEmbeddings(reqCtx) {
        const {videoFile, type} = reqCtx;
        const buffer = videoFile.buffer;
       // const base64EncodedVideo = buffer.toString('base64');
        const truncatedVideoBuffer = await this.uploadEmbeddingLogic.truncateVideo(buffer, 10);
        const response = await this.googleEmbeddingService.generateEmbeddings(truncatedVideoBuffer);

        const embedding = _.get(response, 'predictions[0].videoEmbeddings[0].embedding');
        return await this.pineconeUploadService.searchEmbedding(embedding, type);
    }
}

module.exports = CreateEmbeddingLogic;
