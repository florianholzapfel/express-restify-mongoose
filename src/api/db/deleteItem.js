const http = require('http')
const findById = require('./../shared').findById
const APIMethod = require('../../APIMethod')
const Promise = require('bluebird')

/**
 * Delete a single object.
 * Chooses between findOneAndRemove() and remove() based on the options.
 *
 * @param {ERMOperation} state
 * @param {Object} req - the Express request
 * @return {Promise}
 */
function doDeleteItem (state, req) {
  if (state.options.findOneAndRemove) {
    // Explicit construction because contextFilter() takes a callback
    return new Promise((resolve, reject) => {
      state.options.contextFilter(
        state.model,
        req,
        filteredContext => {
          // Find the document specified in the URL, searching only in the context.
          findById(filteredContext, req.params.id, state.options.idProperty)
            .findOneAndRemove()
            .then(document => {
              if (!document) {
                // The document wasn't found -- return 404
                return reject(new Error(http.STATUS_CODES[404]))
              }

              return resolve(state.set('statusCode', 204))
            })
            .catch(err => reject(err))
        }
      )
    })
  } else {
    // Not using findOneAndRemove(), so just remove the document directly.
    if (!state.document) {
      return Promise.reject(new Error(http.STATUS_CODES[404]))
    }

    return state.document.remove()
      .then(() => state.set('statusCode', 204))
  }
}

module.exports = new APIMethod(doDeleteItem)
