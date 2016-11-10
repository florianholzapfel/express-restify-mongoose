const APIMethod = require('../../APIMethod')
const getQueryBuilder = require('../../buildQuery')
const cloneMongooseQuery = require('../shared').cloneMongooseQuery

/**
 * Given global query options, a Mongoose context (just a ModelQuery), and a Mongo
 * query, get the count of objects matching the context and query.
 *
 * @param {Object} queryOptions - Global options to apply to all queries
 * @param queryOptions.lean
 * @param queryOptions.readPreference
 * @param queryOptions.limit
 *
 * @param {ModelQuery} mongooseContext - The documents to query
 * @param {Object} query - MongoDB query object to apply to the context
 *
 * @return {Promise}
 */
function getCount (queryOptions, mongooseContext, query) {
  const buildQuery = getQueryBuilder(queryOptions)
  return buildQuery(cloneMongooseQuery(mongooseContext.count()), query)
}

function getCountWithRequest (state, req) {
  // Explicit construction because contextFilter() takes a callback
  return new Promise((resolve, reject) => {
    state.options.contextFilter(
      state.model,
      req,
      filteredContext => {
        getCount(state.options, filteredContext, state.query)
          .then(count => {
            return resolve(
              state
                .setResult({ count: count })
                .setStatusCode(200)
            )
          })
          .catch(err => reject(err))
      }
    )
  })
}

module.exports = new APIMethod(
  getCount,
  getCountWithRequest
)
