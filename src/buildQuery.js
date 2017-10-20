'use strict'

const Promise = require('bluebird')

module.exports = function (options) {
  return function (query, queryOptions) {
    const promise = new Promise((resolve, reject) => {
      if (!queryOptions) {
        return resolve(query)
      }

      if (queryOptions.query) {
        query.where(queryOptions.query)
      }

      if (queryOptions.skip) {
        query.skip(queryOptions.skip)
      }

      if (options.limit && (!queryOptions.limit || queryOptions.limit === '0' || queryOptions.limit > options.limit)) {
        queryOptions.limit = options.limit
      }

      if (queryOptions.limit && query.op !== 'count' && !queryOptions.distinct) {
        query.limit(queryOptions.limit)
      }

      if (queryOptions.sort) {
        query.sort(queryOptions.sort)
      }

      if (queryOptions.populate) {
        query.populate(queryOptions.populate)
      }

      if (queryOptions.select) {
        query.select(queryOptions.select)
      }

      if (queryOptions.distinct) {
        query.distinct(queryOptions.distinct)
      }

      if (options.readPreference) {
        query.read(options.readPreference)
      }

      if (options.lean) {
        query.lean(options.lean)
      }

      resolve(query)
    })

    return promise
  }
}
