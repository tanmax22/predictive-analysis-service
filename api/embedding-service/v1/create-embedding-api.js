class CreateEmbeddingApi {
    constructor(utility, createEmbeddingLogic) {
        this.utility = utility;
        this.CreateEmbeddingLogic = createEmbeddingLogic;
    }

    async handleRequest(req, res) {
        try {
            if(!req.file) {
                return this.utility.sendErrorResponse('No file uploaded', null, res);
            }
            const reqCtx = {
                videoFile: req.file,
                type: req.body.type
            }

            let [err, response] = await this.utility.invoker(this.CreateEmbeddingLogic.createEmbeddings(reqCtx));
            if (err) {
                console.log('err',err);
                return this.utility.sendErrorResponse('Could not create embeddings of the video', err, res);
            }
            return this.utility.writeResponse(null, {
                msg: 'Successfully Created Embeddings of the video',
                data: response
            }, res);
        } catch(error) {
            console.log('error', error);
            return this.utility.sendErrorResponse('Could not create embeddings of the video', error, res);
        }
    }
}

module.exports = CreateEmbeddingApi;
