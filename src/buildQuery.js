const Promise = require('bluebird')

/**
 * Given global (ERM-instance-wide) query-building options, returns a function that extends a
 * partial query with local (request-specific) query options.
 *
 * @param {Object} globalOptions - ERM-instance query options
 * @param {Number} globalOptions.limit -
 * @param {String} globalOptions.readPreference -
 * @param {Boolean} globalOptions.lean -
 *
 * @return {function(ModelQuery, Object): Promise}
 */
module.exports = function (globalOptions) {
  // Note: requestSpecificQueryOptions should be the result of a prepareQuery() call
  return function (query, requestSpecificQueryOptions) {
    const promise = new Promise((resolve, reject) => {
      if (!requestSpecificQueryOptions) {
        return resolve(query)
      }

      if (requestSpecificQueryOptions.query) {
        query.where(requestSpecificQueryOptions.query)
      }

      if (requestSpecificQueryOptions.skip) {
        query.skip(requestSpecificQueryOptions.skip)
      }

      if (globalOptions.limit && (!requestSpecificQueryOptions.limit || requestSpecificQueryOptions.limit === '0' || requestSpecificQueryOptions.limit > globalOptions.limit)) {
        requestSpecificQueryOptions.limit = globalOptions.limit
      }

      if (requestSpecificQueryOptions.limit && query.op !== 'count' && !requestSpecificQueryOptions.distinct) {
        query.limit(requestSpecificQueryOptions.limit)
      }

      if (requestSpecificQueryOptions.sort) {
        query.sort(requestSpecificQueryOptions.sort)
      }

      if (requestSpecificQueryOptions.populate) {
        query.populate(requestSpecificQueryOptions.populate)
      }

      if (requestSpecificQueryOptions.select) {
        query.select(requestSpecificQueryOptions.select)
      }

      if (requestSpecificQueryOptions.distinct) {
        query.distinct(requestSpecificQueryOptions.distinct)
      }

      if (globalOptions.readPreference) {
        query.read(globalOptions.readPreference)
      }

      if (globalOptions.lean) {
        query.lean(globalOptions.lean)
      }

      resolve(query)
    })

    return promise
  }
}
