const express = require('express');
const multer = require('multer');

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({storage: storage});

router.post('/embeddings/create', upload.single('file'), (req, res, next) => {
    req.container.resolve('createEmbeddingApi').handleRequest(req, res).catch(next);
});

router.post('/embeddings/upload', (req, res, next) => {
    req.container.resolve('uploadEmbeddingApi').handleRequest(req, res).catch(next);
});

router.post('/embeddings/bulk/upload', upload.single('file'), (req, res, next) => {
    req.container.resolve('bulkUploadEmbeddingApi').handleRequest(req, res).catch(next);
});

module.exports = router;
