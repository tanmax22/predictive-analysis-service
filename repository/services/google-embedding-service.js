const {GoogleAuth} = require('google-auth-library');

const _ = require('lodash');

class GoogleEmbeddingService {
    constructor( http, utility, config) {
        this.endpoint = config.services.geminiService;
        this.config = config;
        this.http = http;
    }


    async getAuthenticatedClient() {
        const auth = new GoogleAuth({
            keyFile: this.config.envConf.googleImageCredentialPath,
            scopes: 'https://www.googleapis.com/auth/cloud-platform'

        })
        const client = await auth.getClient();
        const accessToken = await client.authorize();

        return {geminiToken: _.get(accessToken, 'access_token')};
    }

    async generateEmbeddings(base64EncodedVideo){
        const {geminiToken} = await this.getAuthenticatedClient();
        const reqBody = {
            instances: [
                {
                    video: {
                        bytesBase64Encoded: base64EncodedVideo
                    },
                    parameters: {
                        dimension: 1408
                    }
                }
            ]
        }
        const options = {
            reqSetting: {
                srvConfig: this.endpoint.srvConfig,
                pathname: 'publishers/google/models/multimodalembedding@001:predict',
                baseURL: this.endpoint.url
            },
            method: 'POST',
            timeout: 1200000,
            validStatus: [200],
            body: reqBody,
            url: `${this.endpoint.url}/publishers/google/models/multimodalembedding@001:predict`,
            headers: {
                Authorization: `Bearer ${geminiToken}`
            }
        };
        const resp = await this.http.request(options);
        return resp.responseBody;
    }

    async generateVideoAnalysis(base64EncodedVideo, prompt, mimeType){
        const {geminiToken} = await this.getAuthenticatedClient();
        const reqBody = {
            contents: [
                {
                    role: 'user',
                    parts: [
                        {
                            text:prompt
                        },
                        {
                            inlineData: {
                                mimeType: mimeType,
                                data: base64EncodedVideo
                            }
                        }
                    ]
                }
            ],
        }
        const options= {
            reqSetting: {
                srvConfig: this.endpoint.srvConfig,
                pathname: 'publishers/google/models/gemini-1.5-flash-001:generateContent',
                baseURL: this.endpoint.url
            },
            method: 'POST',
            timeout: 1200000,
            validStatus: [200],
            body: reqBody,
            url: `${this.endpoint.url}/publishers/google/models/gemini-1.5-flash-001:generateContent`,
            headers: {
                Authorization: `Bearer ${geminiToken}`
            }
        }
        const resp = await this.http.request(options);
        return resp.responseBody;
    }
}
module.exports = GoogleEmbeddingService;
