const Joi = require('joi');
const _ = require('lodash');


const CreateEmbeddingSchema = Joi.object({
    type: Joi.string().required().valid('TEXT_EMBEDDING', 'MULTI_MODAL_EMBEDDING'),
    content: Joi.when('type', {
        is: 'TEXT_EMBEDDING',
        then: Joi.string().required(),
        otherwise: Joi.forbidden()
    }),
    bytesBase64Encoded: Joi.when('type', {
        is: 'MULTI_MODAL_EMBEDDING',
        then: Joi.string().required(),
        otherwise: Joi.forbidden()
    })
})

module.exports = {
    CreateEmbeddingSchema: CreateEmbeddingSchema
}
