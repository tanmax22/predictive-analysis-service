const { createContainer, asValue, asClass, InjectionMode, Lifetime } = require('awilix');

const config = require('../config/config');
const serverConfig = require('../config/server-config');
const util = require('../util');
const drivers = require('../drivers')

const container = createContainer({injectionMode: InjectionMode.CLASSIC});

function getScope() {
    return { lifetime: Lifetime.SINGLETON };
}

container.register({


    //------------------ DRIVERS --------------------
    pineconeClient: asValue(drivers.vectorDB),

    //------------------ CONFIG ------------------------
    config: asValue(config),
    serverConfig: asValue(serverConfig),

    //------------------ UTILITY -----------------------
    utility: asClass(util.Utility, getScope()),

    http: asClass(util.HTTP, getScope())
        .inject(() => ({ callerName: config.serviceName })),
})

//------------------------------------ API ----------------------------------------------------------------------------------------------------
container.register('createEmbeddingApi', asClass(require('../api/embedding-service/v1/create-embedding-api'), getScope()));
container.register('uploadEmbeddingApi', asClass(require('../api/embedding-service/v1/upload-embedding-api'), getScope()));
container.register('bulkUploadEmbeddingApi', asClass(require('../api/embedding-service/v1/bulk-upload-embedding-api'), getScope()));
container.register('aiAnalysisApi', asClass(require('../api/embedding-service/v1/ai-analysis-api'), getScope()));



//------------------------------------ Logic --------------------------------------------------------------------------------------------------
container.register('createEmbeddingLogic', asClass(require('../logic/embedding-logic/create-embedding-logic'), getScope()));
container.register('uploadEmbeddingLogic', asClass(require('../logic/embedding-logic/upload-embedding-logic'), getScope()));
container.register('bulkUploadEmbeddingLogic', asClass(require('../logic/embedding-logic/bulk-upload-embedding-logic'), getScope()));
container.register('aiAnalysisLogic', asClass(require('../logic/embedding-logic/ai-analysis-logic'), getScope()));


//------------------------------------ Service --------------------------------------------------------------------------------------------------
container.register('googleEmbeddingService', asClass(require('../repository/services/google-embedding-service'), getScope()));
container.register('pineconeUploadService', asClass(require('../repository/services/pinecone-upload-service'), getScope()));


module.exports = container;
