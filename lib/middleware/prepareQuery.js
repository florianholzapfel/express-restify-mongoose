var _ = require('lodash')

module.exports = function (options) {
  function jsonQueryParser (key, value) {
    if (_.isString(value)) {
      if (value[0] === '~') { // parse RegExp
        return new RegExp(value.substr(1), 'i')
      } else if (value[0] === '>') {
        if (value[1] === '=') {
          return { $gte: value.substr(2) }
        } else {
          return { $gt: value.substr(1) }
        }
      } else if (value[0] === '<') {
        if (value[1] === '=') {
          return { $lte: value.substr(2) }
        } else {
          return { $lt: value.substr(1) }
        }
      } else if (value[0] === '!' && value[1] === '=') {
        return { $ne: value.substr(2) }
      /* This feature was disabled because it requires MongoDB 3
      } else if (value[0] === '=') {
        return { $eq: value.substr(1) }*/
      }
    } else if (_.isArray(value) && key[0] !== '$') {
      return { $in: value }
    }

    return value
  }

  function parseQueryOptions (queryOptions) {
    var i, length, populate, select

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

          // If other specific fields are selected, add the populated field
          if (queryOptions.select) {
            if (Object.keys(queryOptions.select).length > 0 && !queryOptions.select[populate[i]]) {
              queryOptions.select[populate[i]] = 1
            }

            if (Object.keys(queryOptions.select).length === 0) {
              delete queryOptions.select
            }
          }
        }
      } else if (!_.isArray(queryOptions.populate)) {
        queryOptions.populate = [queryOptions.populate]
      }
    }

    return queryOptions
  }

  return function (req, res, next) {
    var whitelist = ['distinct', 'limit', 'populate', 'query', 'select', 'skip', 'sort']

    req._ermQueryOptions = {}

    for (var key in req.query) {
      if (whitelist.indexOf(key) === -1) {
        continue
      }

      if (key === 'query') {
        try {
          req._ermQueryOptions[key] = JSON.parse(req.query[key], jsonQueryParser)
        } catch (e) {
          var err = new Error('%s must be a valid JSON string')
          err.description = 'invalid_json'
          err.statusCode = 400
          return options.onError(err, req, res, next)
        }
      } else if (key === 'populate' || key === 'select' || key === 'sort') {
        try {
          req._ermQueryOptions[key] = JSON.parse(req.query[key])
        } catch (e) {
          req._ermQueryOptions[key] = req.query[key]
        }
      } else {
        req._ermQueryOptions[key] = req.query[key]
      }
    }

    req._ermQueryOptions = parseQueryOptions(req._ermQueryOptions)

    next()
  }
}
