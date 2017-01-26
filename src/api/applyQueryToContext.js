const getQueryBuilder = require('../buildQuery')
const cloneMongooseQuery = require('./shared').cloneMongooseQuery

/**
 * Given ERM query options, a Mongoose context (a ModelQuery), and a Mongo
 * query (usually from a query string), returns a ModelQuery that performs the query specified
 * in the query string object, but restricted to the context and with the ERM query options
 * applied.
 *
 * @param {Object} queryOptions - Global ERM options to apply to all queries
 * @param queryOptions.lean
 * @param queryOptions.readPreference
 * @param queryOptions.limit
 *
 * @param {ModelQuery} mongooseContext - The documents to query
 * @param {Object} queryStringObject - MongoDB query object to apply to the context
 *
 * @return {Promise}
 */
module.exports = function applyQueryToContext (queryOptions, mongooseContext, queryStringObject) {
  const buildQuery = getQueryBuilder(queryOptions)
  return buildQuery(cloneMongooseQuery(mongooseContext), queryStringObject)
}

