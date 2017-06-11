const APIOperation = require('../../Transformation').APIOperation
const applyQueryToContext = require('../applyQueryToContext')

/**
 * Delete all of the items specified by a query in an Express request.
 *
 * @param {ERMOperation} state
 * @return {Promise}
 */
function doDeleteItems (state) {
  // Explicit construction because contextFilter() takes a callback
  return applyQueryToContext(state.options, state.context.remove(), state.query)
    .then(() => state.set('statusCode', 204))
}

module.exports = new APIOperation(doDeleteItems)
