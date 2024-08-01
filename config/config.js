
const allConfig = {
    serviceName: 'predictive-analysis-service',
    envConf: {
        googleImageCredentialPath: process.env.GOOGLE_IMAGEN_CREDENTIAL_PATH
    },
    services: {
        geminiService: {
            url: 'https://us-central1-aiplatform.googleapis.com/v1/projects/gro-main/locations/us-central1',
            srvConfig: {
                useSRV: false,
            }
        }
    },
    database: {
        mongoDB: {
            connStr: process.env.MONGO_URI
        }
    }
}

module.exports = allConfig;
