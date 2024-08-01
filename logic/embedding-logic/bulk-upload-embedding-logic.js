const fs = require('fs').promises;
const path = require('path');
const _ = require('lodash');
const {CustomError} = require("../../types/customErrors");

class BulkUploadEmbeddingLogic {
    constructor(googleEmbeddingService, pineconeUploadService, uploadEmbeddingLogic) {
        this.googleEmbeddingService = googleEmbeddingService;
        this.pineconeUploadService = pineconeUploadService;
        this.uploadEmbeddingLogic = uploadEmbeddingLogic;
    }

    async bulkUploadEmbedding(jsonFile) {
        // Read the uploaded file
        const fileBuffer = jsonFile.buffer;
        const jsonObjectArray = await JSON.parse(fileBuffer.toString('utf8'));
       // console.log('jsonObjectArray', jsonObjectArray.data);
        for (const value of jsonObjectArray.data) {
            this.processJSON(value, 2).then(() => {
                console.log('completed');
            }).catch((err) => {
                console.log('Unable to process Json Object');
            });
            await this.delay(10000);
        }
        return null
    }

    async processJSON (jsonObject, retryCnt) {
        if(retryCnt === 0) {
            return new CustomError('Unable to process Json', 500);
        }
        try{
            const base64EncodedVideo = await this.uploadEmbeddingLogic.fetchBase64Video(jsonObject.videoUrl);
            const videoEmbedding = await this.googleEmbeddingService.generateEmbeddings(base64EncodedVideo);
            const payload = {
                embedding: videoEmbedding.predictions[0].videoEmbeddings[0].embedding,
                metaData: {...jsonObject, objective: jsonObject.resultName}
            };
            return await this.pineconeUploadService.uploadEmbedding(payload);
        } catch(err) {
            console.log('process json error', err);
            await this.delay(10000); // Wait for 10 seconds before retrying
            return await this.processJSON(jsonObject, retryCnt-1);
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = BulkUploadEmbeddingLogic;
