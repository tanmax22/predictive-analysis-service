const _ = require('lodash');

class AiAnalysisLogic {
    constructor(uploadEmbeddingLogic, googleEmbeddingService, utility) {
        this.uploadEmbeddingLogic = uploadEmbeddingLogic;
        this.googleEmbeddingService = googleEmbeddingService;
        this.utility = utility;
    }

    async analyzeVideo(reqCtx){
        const {videoFile, type} = reqCtx;
        const buffer = videoFile.buffer;

        const truncatedVideoBuffer = await this.uploadEmbeddingLogic.truncateVideo(buffer, 10);
        const prompt = await this.generateAnalysisPrompt(type);

        const responseAnalysis = await this.googleEmbeddingService.generateVideoAnalysis(truncatedVideoBuffer, prompt, videoFile.mimetype);
        const jsonResponse = this.utility.captureOuterJson(_.get(responseAnalysis, 'candidates[0].content.parts[0].text'));
        return jsonResponse
    }

    async generateAnalysisPrompt(objective){
        let prompt = `You are UGC (User Generated Content) expert who is well trained in analyzing ugc adds based on 
        parameters like cpm (cost per mile), ctr (click through rate), cpc (cost per click) and ROAS (Return On Add Spent), using all 
        these experience you will have to evaluate the Ugc add video attached for the first 10 seconds to know whether people will stick to it or
        not provide your feedback on it, in form of Analysis (In analysis part you had to provide two things, first is positive observation you had 
        about the product and second is the negative observation), and second
        is suggestion (advise the owner of the video and recommend them bulleted points to improve the video). 
        Your response must follow the format given without any additional text.
        ### Response format
		\`\`\`json
		{
			"analysis": {
			    "positiveFeedback": "string",
			    "negativeFeedback": "string"
			},
			"suggestion": "string"
		}
		\`\`\`
		### Some Important Points
		1. Make sure you are really accurate on your feedback and suggestion.
		2. If you don't find positives or negatives about any video just acknowledge it in your response.
		3. Make sure you response in bulleted points for both analysis and suggestion.
		4. I'll provide the objective the video is trying to achieve, you have to analyze the video based on that.
		5. You will only be provided with the first 10 seconds of the video, because that's the most important part of
		the video, so analyse the video keeping this in consideration. You just had to comment on the first 10 seconds of the
		video. So don't give feedback like the video is short, or about anythings whoose context you don't have in the video
		
		Objective -: ${objective}
		
		Note -: Your response should be in the format mentioned above and none of the response field has to be empty, 
		Also make sure to only provide json responses nothing more than that. 
		Please stick to the format !!!
        `
        return prompt;
    }
}

module.exports = AiAnalysisLogic;
