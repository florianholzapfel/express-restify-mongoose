var _ = require('lodash')

module.exports = function (options) {
  return function (query, queryOptions) {
    var arr, i

    queryOptions = queryOptions || {}

    // H+ exposes Query AND, OR and WHERE methods
    if (queryOptions.query) {
      query.where(queryOptions.query)
    }

    if (queryOptions.skip) {
      query.skip(queryOptions.skip)
    }

    if (options.limit && query.op !== 'count' && (!queryOptions.limit || queryOptions.limit > options.limit)) {
      queryOptions.limit = options.limit
    }

    if (queryOptions.limit) {
      query.limit(queryOptions.limit)
    }

    if (queryOptions.sort) {
      query.sort(queryOptions.sort)
    }

    var selectObj = {
      root: {}
    }

    if (queryOptions.select) {
      arr = queryOptions.select.split(',')

      for (i = 0; i < arr.length; ++i) {
        var selectItem = arr[i]
        var selectionModifier = 1

        if (selectItem.match(/^\-/)) { // exclusion
          selectItem = selectItem.substring(1)
          selectionModifier = 0
        }

        if (selectItem.match(/\./)) {
          var subSelect = selectItem.split('.')

          if (!selectObj[subSelect[0]]) {
            selectObj[subSelect[0]] = {}
          }

          selectObj[subSelect[0]][subSelect[1]] = selectionModifier
        } else {
          selectObj.root[selectItem] = selectionModifier
        }
      }

      query = query.select(selectObj.root)
    }

    if (queryOptions.populate) {
      arr = queryOptions.populate.split(',')

      for (i = 0; i < arr.length; ++i) {
        if (!_.isUndefined(selectObj[arr[i]]) && !_.isEmpty(selectObj.root)) {
          selectObj.root[arr[i]] = 1
        }

        query = query.populate(arr[i], selectObj[arr[i]])
      }

      query.select(selectObj.root)
    }

    if (queryOptions.projection) {
      query.select(queryOptions.projection)
    }

    if (queryOptions.distinct) {
      query.distinct(queryOptions.distinct)
    }

    return query
  }
}
