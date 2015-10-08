module.exports = function (options) {
  return function (query, queryOptions) {
    if (!queryOptions) {
      return query
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

    if (queryOptions.limit && query.op !== 'count') {
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

    return query
  }
}
