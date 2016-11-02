const http = require('http')
const findById = require('./../shared').findById
const APIMethod = require('../../APIMethod')
const Promise = require('bluebird')
const _ = require('lodash')

/**
 * Given a mongoose query, a document id, and the model's id property,
 * removes the document specified by the id.
 *
 * @param {ModelQuery} query - the documents to search
 * @param {String} documentId - the document's id
 * @param {String} idProperty - the model's id property
 * @return {Promise}
 */
function findOneAndRemove (query, documentId, idProperty) {
  return findById(query, documentId, idProperty)
    .findOneAndRemove()
}

const DELETE_SUCCESS = {
  erm: {
    statusCode: 204
  }
}

/**
 * Delete a single object.
 * Chooses between findOneAndRemove() and remove() based on the options.
 *
 * @param {ERMOperation} ermInstance
 * @param {Object} req - the Express request
 * @return {Promise}
 */
function deleteItemWithRequest (ermInstance, req) {
  if (ermInstance.options.findOneAndRemove) {
    // Explicit construction because contextFilter() takes a callback
    return new Promise((resolve, reject) => {
      ermInstance.options.contextFilter(
        ermInstance.model,
        req,
        filteredContext => {
          findOneAndRemove(filteredContext, req.params.id, ermInstance.options.idProperty)
            .then(document => {
              if (!document) {
                // The document wasn't found -- return 404
                return reject(new Error(http.STATUS_CODES[404]))
              }

              return resolve(DELETE_SUCCESS)
            })
            .catch(err => reject(err))
        }
      )
    })
  } else {
    // Not using findOneAndRemove(), so just remove the document directly.
    if (!req.erm || !req.erm.document) {
      return Promise.reject(new Error('No document found'))
    }

    return req.erm.document.remove()
      .then(_.constant(DELETE_SUCCESS))
  }
}

module.exports = new APIMethod(
  findOneAndRemove,
  deleteItemWithRequest
)
