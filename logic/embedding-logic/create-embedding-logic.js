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
        const similarContent = await this.pineconeUploadService.searchEmbedding(embedding, type);
        const expectedPmMetric = {
            Clicks: (_.get(similarContent, 'matches[0].metadata.clicks')*5 + _.get(similarContent, 'matches[1].metadata.clicks')*3 +
                _.get(similarContent, 'matches[2].metadata.clicks')*2) || '--',
            CostPerResult: (_.get(similarContent, 'matches[0].metadata.costPerResult')*5 + _.get(similarContent, 'matches[1].metadata.costPerResult')*3 +
                _.get(similarContent, 'matches[2].metadata.costPerResult')*2) || '--',
            Cpc: (_.get(similarContent, 'matches[0].metadata.cpc')*5 + _.get(similarContent, 'matches[1].metadata.cpc')*3 +
                _.get(similarContent, 'matches[2].metadata.cpc')*2) || '--',
            Cpm: (_.get(similarContent, 'matches[0].metadata.cpm')*5 + _.get(similarContent, 'matches[1].metadata.cpm')*3 +
                _.get(similarContent, 'matches[2].metadata.cpm')*2) || '--',
            Ctr: (_.get(similarContent, 'matches[0].metadata.ctr')*5 + _.get(similarContent, 'matches[1].metadata.ctr')*3 +
                _.get(similarContent, 'matches[2].metadata.ctr')*2) || '--',
            Impressions: (_.get(similarContent, 'matches[0].metadata.impressions')*5 + _.get(similarContent, 'matches[1].metadata.impressions')*3 +
                _.get(similarContent, 'matches[2].metadata.impressions')*2) || '--',
            PurchaseROAS: (_.get(similarContent, 'matches[0].metadata.purchaseROAS')*5 + _.get(similarContent, 'matches[1].metadata.purchaseROAS')*3 +
                _.get(similarContent, 'matches[2].metadata.purchaseROAS')*2) || '--',
            Reach: (_.get(similarContent, 'matches[0].metadata.reach')*5 + _.get(similarContent, 'matches[1].metadata.reach')*3 +
                _.get(similarContent, 'matches[2].metadata.reach')*2) || '--',
            Results: (_.get(similarContent, 'matches[0].metadata.results')*5 + _.get(similarContent, 'matches[1].metadata.results')*3 +
                _.get(similarContent, 'matches[2].metadata.results')*2) || '--',
            ResultName: (_.get(similarContent, 'matches[0].metadata.resultName')) || '--'
        }
        return {...similarContent, metricPredictions: expectedPmMetric};
    }
}

module.exports = CreateEmbeddingLogic;
