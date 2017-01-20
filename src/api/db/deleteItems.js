const APIMethod = require('../../APIMethod')
const applyQueryToContext = require('../applyQueryToContext')

/**
 * Delete all of the items specified by a query in an Express request.
 *
 * @param {ERMOperation} state
 * @param {Object} req
 * @return {Promise}
 */
function doDeleteItems (state, req) {
  // Explicit construction because contextFilter() takes a callback
  return new Promise((resolve, reject) => {
    state.options.contextFilter(
      state.model,
      req,
      filteredContext => {
        applyQueryToContext(state.options, filteredContext.remove(), state.query)
          .then(() => resolve(state.set('statusCode', 204)))
          .catch(err => reject(err))
      }
    )
  })
}

module.exports = new APIMethod(doDeleteItems)
