class AiAnalysisApi {
    constructor(utility, aiAnalysisLogic) {
        this.utility = utility;
        this.aiAnalysisLogic = aiAnalysisLogic;
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

            let [err, response] = await this.utility.invoker(this.aiAnalysisLogic.analyzeVideo(reqCtx));
            if(err) {
                return this.utility.sendErrorResponse('Could not create embeddings of the video', err, res);
            }
            return this.utility.writeResponse(null, {
                msg: 'Successfully generated analysis of the video',
                data: response
            }, res);
        } catch(err) {
            return this.utility.sendErrorResponse('Internal Server Error', err, res);
        }
    }
}

module.exports = AiAnalysisApi;
