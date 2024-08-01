const express = require('express');
const morgan = require('morgan');
const helmet = require('helmet');
const bodyparser = require('body-parser');
const cors = require('cors');
const router = require('./api/router');
const { CustomError } = require('./types/customErrors');

const server = (container) => {
    const app = express();

    process.on('SIGINT', () => {
        process.exit(0);
    });

    app.use(morgan('dev'));
    // parse application/x-www-form-urlencoded
    app.use(bodyparser.urlencoded({
        extended: true
    }));
    // parse application/json
    app.use(bodyparser.json({
        limit: '10mb',
        strict: false
    }));

    // parse octet-stream
    app.use(bodyparser.raw({ type: 'application/octet-stream' }));

    app.use(cors());
    app.use(helmet());

    app.use((req, res, next) => {
        req.container = container.createScope();
        next();
    });
    app.get('/health', (req, res) => {
        return res.send('Hello from Hypergro Service!');
    });

    app.use('/public/', (req, res, next) => {
        req.locals = {
            isInternal: true
        };
        next();
    }, router);

    app.use((err, req, res, next) => {
        if (err instanceof CustomError) {
            return container.resolve('utility').sendErrorResponse('Something went wrong', err, res);
        }

        // container.resolve('logger').error('Unhandled Exception', { req, err: err, event: req.body, path: req.path });
        return res.status(500).send(`Something went wrong!, err:${err}`);
    });

    return app;
};

module.exports = server;
