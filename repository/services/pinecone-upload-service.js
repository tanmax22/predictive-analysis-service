class PineconeUploadService {

    constructor(http, pineconeClient, utility) {
        this.http = http;
        this.pineconeClient = pineconeClient;
        this.utility = utility;
    }

    async uploadEmbedding(payload) {
        const {embedding, metaData} = payload;
        const index = this.pineconeClient.index('video-analysis-db');
        const values = [{
            id: this.utility.generateUUIDV4(),
            values: embedding,
            metadata: metaData
        }]
        return await index.namespace(metaData.objective).upsert(values);
    }

    async searchEmbedding(queryVector, nameSpace) {
        const index = this.pineconeClient.index('video-analysis-db');
        const queryObj = {
            vector: queryVector,
            topK: 3,
            includeMetadata: true
        }
        const response = await index.namespace(nameSpace).query(queryObj);
        return response;
    }
}

module.exports = PineconeUploadService;
