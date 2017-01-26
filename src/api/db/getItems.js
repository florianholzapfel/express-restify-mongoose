const isDistinctExcluded = require('./../shared').isDistinctExcluded
const _ = require('lodash')

const APIMethod = require('../../APIMethod')
const applyQueryToContext = require('../applyQueryToContext')

/**
 * Get all of the items matching a query inside some consumer-provided context.
 *
 * Note: Sets the total count of the operation if the totalCountHeader option is set.
 *
 * @param {ERMOperation} state
 * @param {Object} req
 * @return {Promise<ERMOperation>}
 */
function doGetItems (state, req) {
  // If distinct is excluded, there won't be anything to return.
  if (isDistinctExcluded(state.options.filter, state.excludedMap, req)) {
    return Promise.resolve(
      state.set('result', []).set('statusCode', 200)
    )
  }

  return applyQueryToContext(state.options, state.context.find(), state.query)
    .then(items => {
      // Find the items for all configurations, and set the status code
      return state.set('result', items).set('statusCode', 200)
    })
    .then(stateWithResult => {
      // If totalCountHeader is set and distinct isn't set, also get the total count
      if (stateWithResult.options.totalCountHeader && !stateWithResult.query.distinct) {
        return getTotalCountHeader(state, req)
          .then(count => {
            return stateWithResult.set('totalCount', count)
          })
      }

      return stateWithResult
    })
}

/**
 * Get the total count of items matching a query inside some consumer-provided context.
 *
 * Note: sets skip = 0 and limit = 0 for the query in state.
 *
 * @param {ERMOperation} state
 * @param {Object} req
 * @return {Promise<Number>}
 */
function getTotalCountHeader (state, req) {
  const noSkipOrLimit = _.assign({},
    state.query,
    {
      skip: 0,
      limit: 0
    }
  )

  return applyQueryToContext(state.options, state.context.count(), noSkipOrLimit)
}

module.exports = new APIMethod(doGetItems)
