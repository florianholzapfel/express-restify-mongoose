const getQueryBuilder = require('../../buildQuery')
const APIMethod = require('../../APIMethod')

const cloneMongooseQuery = require('../shared').cloneMongooseQuery

/**
 * Given global query options, a Mongoose context (just a ModelQuery), and a Mongo
 * query, removes the documents in the context that match the Mongo query.
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
function deleteItems (queryOptions, mongooseContext, query) {
  const buildQuery = getQueryBuilder(queryOptions)
  return buildQuery(cloneMongooseQuery(mongooseContext.remove()), query)
}

/**
 * Delete all of the items specified by a query in an Express request.
 *
 * @param {ERMOperation} state
 * @param {Object} req
 * @return {Promise}
 */
function deleteItemsWithRequest (state, req) {
  // Explicit construction because contextFilter() takes a callback
  return new Promise((resolve, reject) => {
    state.options.contextFilter(
      state.model,
      req,
      filteredContext => {
        deleteItems(state.options, filteredContext, state.query)
          .then(() => resolve(state.set('statusCode', 204)))
          .catch(err => reject(err))
      }
    )
  })
}

module.exports = new APIMethod(
  deleteItems,
  deleteItemsWithRequest
)
