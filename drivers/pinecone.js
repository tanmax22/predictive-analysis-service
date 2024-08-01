const {Pinecone} = require('@pinecone-database/pinecone');

const vectorDB = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY
})

module.exports = {
    vectorDB
}
