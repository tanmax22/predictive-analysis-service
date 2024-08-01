class UploadEmbeddingApi {

    constructor(utility, uploadEmbeddingLogic) {
        this.utility = utility;
        this.uploadEmbeddingLogic = uploadEmbeddingLogic;
    }

    async handleRequest(req, res) {
        try{
            let [err, response] = await this.utility.invoker(this.uploadEmbeddingLogic.createAndUploadEmbedding(req.body))
            console.log('response', response);
            if(err) {
                console.log('error', err);
                return this.utility.sendErrorResponse('Internal Server Error', err, res);
            }
            return this.utility.writeResponse(null, {
                msg: 'Successfully created and uploaded the embeddings',
                data: response
            }, res);
        } catch(err) {
            console.log('err', err);
            return this.utility.sendErrorResponse('Internal Server Error', err, res);
        }
    }
}

module.exports = UploadEmbeddingApi;
