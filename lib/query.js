var _ = require('lodash')
var http = require('http')

module.exports = function (model, filter, options) {
  var queryOptions = {
    protected: ['skip', 'limit', 'sort', 'distinct', 'populate', 'select', 'lean', '$and', '$or', 'query', 'projection'],
    current: {}
  }

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
    var excludedarr = filter.getExcluded(req.access)
    var arr, i, re

    for (var key in queryOptions.clean) {
      if (excludedarr.indexOf(key) !== -1) {
        // caller tries to query for excluded keys. for security
        // reasons, we will skip the first -1 objects (to provoke
        // an error) and immediately return
        return query.skip(-1)
      }

      query.where(key)
      var value = queryOptions.clean[key]

      if (value[0] === '~') {
        re = new RegExp(value.substring(1), 'i')
        query.where(key).regex(re)
      } else if (value[0] === '>') {
        if (value[1] === '=') {
          query.gte(value.substr(2))
        } else {
          query.gt(value.substr(1))
        }
      } else if (value[0] === '<') {
        if (value[1] === '=') {
          query.lte(value.substr(2))
        } else {
          query.lt(value.substr(1))
        }
      } else if (value[0] === '!' && value[1] === '=') { // H+ for !=
        query.ne(value.substr(2))
      } else if (value[0] === '[' && value[value.length - 1] === ']') {
        query.in(value.substr(1, value.length - 2).split(','))
      } else if (value[0] === '=') {
        query.equals(value.substring(1))
      } else {
        query.equals(value)
      }
    }

    // H+ exposes Query AND, OR and WHERE methods
    if (queryOptions.current.query) {
      query.where(JSON.parse(queryOptions.current.query, jsonQueryParser))
    }

    // TODO - as introduction of QUERY param obsoletes need of $and
    if (queryOptions.current.$and) {
      query.and(JSON.parse(queryOptions.current.$and, jsonQueryParser))
    }

    // TODO - as introduction of QUERY param obsoletes need of $or
    if (queryOptions.current.$or) {
      query.or(JSON.parse(queryOptions.current.$or, jsonQueryParser))
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

  function clean (req, res, next) {
    var err

    queryOptions.current = {}
    queryOptions.clean = _.clone(req.query)

    for (var key in queryOptions.clean) {
      if (queryOptions.protected.indexOf(key) !== -1) {
        queryOptions.current[key] = queryOptions.clean[key]
        delete queryOptions.clean[key]
      } else if (!model.schema.paths.hasOwnProperty(key)) {
        var keys = key.match('.') && !model.schema.paths.hasOwnProperty(key) ? key.split('.') : false

        if (!keys || !model.schema.paths.hasOwnProperty(keys[0]) || !model.schema.paths[keys[0]].schema.paths.hasOwnProperty(keys[1]) || keys.length > 2) {
          if (!model.schema.virtuals.hasOwnProperty(keys[0])) {
            err = new Error(http.STATUS_CODES[400])
            err.description = 'model does not have any property' + keys[0]
            err.status = 400
            break
          }
        }
      }
    }

    next(err)
  }

  return {
    build: build,
    clean: clean,
    current: queryOptions.current
  }
}
