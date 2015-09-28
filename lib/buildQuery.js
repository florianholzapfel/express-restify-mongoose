var _ = require('lodash')

module.exports = function (options) {
  return function (query, queryOptions) {
    var i, length, populate, select

    if (!queryOptions) {
      return query
    }

    if (queryOptions.query) {
      query.where(queryOptions.query)
    }

    if (queryOptions.skip) {
      query.skip(queryOptions.skip)
    }

    if (options.limit && (!queryOptions.limit || queryOptions.limit > options.limit)) {
      queryOptions.limit = options.limit
    }

    if (queryOptions.limit && query.op !== 'count') {
      query.limit(queryOptions.limit)
    }

    if (queryOptions.sort) {
      query.sort(queryOptions.sort)
    }

    if (queryOptions.select) {
      if (_.isString(queryOptions.select)) {
        select = queryOptions.select.split(',')
        queryOptions.select = {}

        for (i = 0, length = select.length; i < length; i++) {
          if (select[i][0] === '-') {
            queryOptions.select[select[i].substring(1)] = 0
          } else {
            queryOptions.select[select[i]] = 1
          }
        }
      }
    }

    if (queryOptions.populate) {
      if (_.isString(queryOptions.populate)) {
        populate = queryOptions.populate.split(',')
        queryOptions.populate = []

        for (i = 0, length = populate.length; i < length; i++) {
          queryOptions.populate.push({
            path: populate[i]
          })

          // If it isn't already, select the field to populate
          if (queryOptions.select && !queryOptions.select[populate[i]]) {
            queryOptions.select[populate[i]] = 1
          }

          for (var key in queryOptions.select) {
            if (key.indexOf(populate[i] + '.') === 0) {
              if (queryOptions.populate[i].select) {
                queryOptions.populate[i].select += ' '
              } else {
                queryOptions.populate[i].select = ''
              }

              if (queryOptions.select[key] === 0) {
                queryOptions.populate[i].select += '-'
              }

              queryOptions.populate[i].select += key.substring(populate[i].length + 1)
              delete queryOptions.select[key]
            }
          }
        }
      } else if (!_.isArray(queryOptions.populate)) {
        queryOptions.populate = [queryOptions.populate]
      }

      query.populate(queryOptions.populate)
    }

    if (queryOptions.select) {
      query.select(queryOptions.select)
    }

    if (queryOptions.distinct) {
      query.distinct(queryOptions.distinct)
    }

    return query
  }
}
