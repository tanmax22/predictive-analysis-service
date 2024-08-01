require('dotenv').config();

const path = require('path')
const mongoose = require('mongoose');

const container = require('./di');
const server = require('./server');

const delay = (time) => new Promise(res => setTimeout(() => res(), time));

let config = container.resolve('config');
const MAX_CONNECTION_RETRIES = 5;
const gracePeriod = 30 * 1000; // 30 secs

// const connectMongoose = async (retriesLeft) => {
//     try {
//         await mongoose.connect(config.database.mongoDB.connStr);
//         console.info('DB connected');
//     } catch (err) {
//         console.error('Failed to connect to mongo, retrying', { time: new Date(), retriesLeft: retriesLeft, err });
//         if (retriesLeft > 0) {
//             await delay(gracePeriod);
//             await connectMongoose(retriesLeft - 1);
//         } else {
//             // It is better to throw error as if, during server start phase, mongoose is not able to connect
//             // it will never even retry, but if it is disconnected in between it will retry
//             throw new Error('Failed to connect to mongo');
//         }
//     }
// };
//
// const connectDatabase = async () => {
//     // default is 10 secs, this is the time mongoose waits for mongo server to become available
//     mongoose.set('bufferTimeoutMS', 5000);
//     mongoose.set('autoIndex', config.envConf.autoIndex);
//
//     mongoose.connection.on('error', (err) => {
//         console.error('Error connecting to MongoDB', {
//             time: new Date(),
//             err: err,
//         });
//     });
//
//     mongoose.connection.on('disconnected', () => {
//         console.error('Disconnected MongoDB', { time: new Date() });
//     });
//
//     mongoose.connection.on('reconnected', () => {
//         console.error('Reconnected MongoDB', { time: new Date() });
//     });
//
//     await connectMongoose(MAX_CONNECTION_RETRIES);
// };


let finalApp;

const main = async () => {
//    await connectDatabase();

    const app = server(container);

    const { port, keepAliveTimeout } = container.resolve('serverConfig');
    if (!port) {
        throw new Error('Port not found, Please check server-index.js');
    }

    finalApp = app.listen(port, () => {
        finalApp.keepAliveTimeout = keepAliveTimeout;
    });
    console.log(`Server started successfully, running on port: ${container.cradle.serverConfig.port}.`);
};


main().catch(err => {
    console.error('Failed to start server', { err });
    process.exit(1);
});


const gracefulShutdown = () => {
    mongoose.connection.close().then(() => {
        console.error('Mongoose disconnected on app termination');
        process.exit(0);
    });
};

process.on('SIGINT', () => {
    gracefulShutdown();
});

process.on('SIGTERM', () => {
    gracefulShutdown();
});
