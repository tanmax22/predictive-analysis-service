const express = require('express');

const embeddingRouter = require('./embedding-service/router');

const router = express.Router();

router.use('/embedding-service', embeddingRouter);

module.exports = router;
