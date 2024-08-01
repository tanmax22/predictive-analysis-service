class BulkUploadEmbeddingApi {
    constructor(utility, bulkUploadEmbeddingLogic) {
        this.utility = utility;
        this.bulkUploadEmbeddingLogic = bulkUploadEmbeddingLogic;
    }

    async handleRequest(req, res) {
        try{
            if(!req.file) {
                return this.utility.sendErrorResponse('No File Uploaded', null, res);
            }
            const [err, response] = await this.utility.invoker(this.bulkUploadEmbeddingLogic.bulkUploadEmbedding(req.file));
            if(err) {
                console.log('err', err);
                return this.utility.sendErrorResponse('Unable to bulk upload the embedding', err, res);
            }
            return this.utility.writeResponse(null,{
                msg: 'Successfully bulk uploaded the embeddings',
                data: response
            }, res);
        } catch(err) {
            console.log('err', err);
            return this.utility.sendErrorResponse('Internal Server Error', err, res);
        }
    }
}
module.exports = BulkUploadEmbeddingApi;
