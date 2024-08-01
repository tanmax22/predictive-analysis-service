const express = require('express');

const routerVersion1 = require('./v1/router')

const router = express.Router();

router.use('/v1', routerVersion1);

module.exports = router;

