var _ = require('lodash')
var http = require('http')

module.exports = function (model, filter, options, queryOptions) {
  // H+ - JSON query param parser, exposes OR, AND and WHERE methods
  // TODO - improve to serve recursive logical operators
  function jsonQueryParser (key, value) {
    if (_.isString(value)) {
      if (value[0] === '~') { // parse RegExp
        return new RegExp(value.substring(1), 'i')
      } else if (value[0] === '>') {
        if (value[1] === '=') {
          return {$gte: value.substr(2)}
        } else {
          return {$gt: value.substr(1)}
        }
      } else if (value[0] === '<') {
        if (value[1] === '=') {
          return {$lte: value.substr(2)}
        } else {
          return {$lt: value.substr(1)}
        }
      } else if (value[0] === '!' && value[1] === '=') {
        return {$ne: value.substr(2)}
      } else if (value[0] === '=') {
        return {$eq: value.substring(1)}
      }
    } else if (_.isArray(value)) {
      if (model.schema.paths.hasOwnProperty(key)) {
        return {$in: value}
      }
    }

    return value
  }

  function build (query, req) {
    var arr, i

    // H+ exposes Query AND, OR and WHERE methods
    if (queryOptions.current.query) {
      query.where(JSON.parse(queryOptions.current.query, jsonQueryParser))
    }

    if (queryOptions.current.skip) {
      query.skip(queryOptions.current.skip)
    }

    if (options.limit && query.op !== 'count' && (!queryOptions.current.limit || queryOptions.current.limit > options.limit)) {
      queryOptions.current.limit = options.limit
    }

    if (queryOptions.current.limit) {
      query.limit(queryOptions.current.limit)
    }

    if (queryOptions.current.sort) {
      try {
        query.sort(JSON.parse(queryOptions.current.sort))
      } catch (e) {
        query.sort(queryOptions.current.sort)
      }
    }

    var selectObj = {
      root: {}
    }

    if (queryOptions.current.select) {
      arr = queryOptions.current.select.split(',')

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

    if (queryOptions.current.populate) {
      arr = queryOptions.current.populate.split(',')

      for (i = 0; i < arr.length; ++i) {
        if (!_.isUndefined(selectObj[arr[i]]) && !_.isEmpty(selectObj.root)) {
          selectObj.root[arr[i]] = 1
        }

        query = query.populate(arr[i], selectObj[arr[i]])
      }

      query.select(selectObj.root)
    }

    if (queryOptions.current.projection) {
      query.select(JSON.parse(queryOptions.current.projection, jsonQueryParser))
    }

    if (queryOptions.current.distinct) {
      query.distinct(queryOptions.current.distinct)
    }

    return query
  }

  return {
    build: build,
    current: queryOptions.current
  }
}
