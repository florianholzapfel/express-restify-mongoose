const http = require('http')
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
    return state.context.findOneAndRemove()
      .then(document => {
        if (!document) {
          // The document wasn't found -- return 404
          return Promise.reject(new Error(http.STATUS_CODES[404]))
        }

        return state.set('statusCode', 204)
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
