const isDistinctExcluded = require('./../shared').isDistinctExcluded
const http = require('http')

const APIOperation = require('../../Transformation').APIOperation
const applyQueryToContext = require('../applyQueryToContext')

/**
 * Retrieve a single document based on a request. Use the query and context filter specified in
 * the ERM operation state.
 *
 * @param {module:ERMOperation} state
 * @return {Promise<ERMOperation>}
 */
function doGetItem (state) {
  if (isDistinctExcluded(state)) {
    return Promise.resolve(
      state.set('result', []).set('statusCode', 200)
    )
  }

  return applyQueryToContext(state.options, state.context, state.query)
    .then(item => {
      if (!item) {
        return Promise.reject(new Error(http.STATUS_CODES[404]))
      }

      return state.set('result', item).set('statusCode', 200)
    })
    .catch(err => {
      console.log('err', err)
      return Promise.reject(err)
    })
}

module.exports = new APIOperation(doGetItem)
