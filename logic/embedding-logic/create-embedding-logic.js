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
        const truncatedVideoBuffer = await this.uploadEmbeddingLogic.truncateVideo(buffer, 5);
        const response = await this.googleEmbeddingService.generateEmbeddings(truncatedVideoBuffer);

        const embedding = _.get(response, 'predictions[0].videoEmbeddings[0].embedding');
        const similarContent = await this.pineconeUploadService.searchEmbedding(embedding, type);
        const expectedPmMetric = {
            Clicks: (_.get(similarContent, 'matches[0].metadata.clicks')*0.5 + _.get(similarContent, 'matches[1].metadata.clicks')*0.3 +
                _.get(similarContent, 'matches[2].metadata.clicks')*0.2) || '--',
            CostPerResult: (_.get(similarContent, 'matches[0].metadata.costPerResult')*0.5 + _.get(similarContent, 'matches[1].metadata.costPerResult')*0.3 +
                _.get(similarContent, 'matches[2].metadata.costPerResult')*0.2) || '--',
            Cpc: (_.get(similarContent, 'matches[0].metadata.cpc')*0.5 + _.get(similarContent, 'matches[1].metadata.cpc')*0.3 +
                _.get(similarContent, 'matches[2].metadata.cpc')*0.2) || '--',
            Cpm: (_.get(similarContent, 'matches[0].metadata.cpm')*0.5 + _.get(similarContent, 'matches[1].metadata.cpm')*0.3 +
                _.get(similarContent, 'matches[2].metadata.cpm')*0.2) || '--',
            Ctr: (_.get(similarContent, 'matches[0].metadata.ctr')*0.5 + _.get(similarContent, 'matches[1].metadata.ctr')*0.3 +
                _.get(similarContent, 'matches[2].metadata.ctr')*0.2) || '--',
            Impressions: (_.get(similarContent, 'matches[0].metadata.impressions')*0.5 + _.get(similarContent, 'matches[1].metadata.impressions')*0.3 +
                _.get(similarContent, 'matches[2].metadata.impressions')*0.2) || '--',
            PurchaseROAS: (_.get(similarContent, 'matches[0].metadata.purchaseROAS')*0.5 + _.get(similarContent, 'matches[1].metadata.purchaseROAS')*0.3 +
                _.get(similarContent, 'matches[2].metadata.purchaseROAS')*0.2) || '--',
            Reach: (_.get(similarContent, 'matches[0].metadata.reach')*0.5 + _.get(similarContent, 'matches[1].metadata.reach')*0.3 +
                _.get(similarContent, 'matches[2].metadata.reach')*0.2) || '--',
            Results: (_.get(similarContent, 'matches[0].metadata.results')*0.5 + _.get(similarContent, 'matches[1].metadata.results')*0.3 +
                _.get(similarContent, 'matches[2].metadata.results')*0.2) || '--',
            ResultName: (_.get(similarContent, 'matches[0].metadata.resultName')) || '--'
        }
        return {...similarContent, metricPredictions: expectedPmMetric};
    }
}

module.exports = CreateEmbeddingLogic;
