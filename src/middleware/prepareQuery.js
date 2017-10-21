'use strict'

const isCoordinates = require('is-coordinates')

module.exports = function (options) {
  const errorHandler = require('../errorHandler')(options)

  function jsonQueryParser (key, value) {
    if (key === '$regex' && !options.allowRegex) {
      return undefined
    }

    if (typeof value === 'string') {
      if (value[0] === '~') { // parse RegExp
        return options.allowRegex ? new RegExp(value.substr(1), 'i') : undefined
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
        return { $eq: value.substr(1) } */
      }
    } else if (Array.isArray(value) && key[0] !== '$' && key !== 'coordinates' && !isCoordinates(value)) {
      return { $in: value }
    }

    return value
  }

  function parseQueryOptions (queryOptions) {
    if (queryOptions.select && typeof queryOptions.select === 'string') {
      let select = queryOptions.select.split(',')
      queryOptions.select = {}

      for (let i = 0, length = select.length; i < length; i++) {
        if (select[i][0] === '-') {
          queryOptions.select[select[i].substring(1)] = 0
        } else {
          queryOptions.select[select[i]] = 1
        }
      }
    }

    if (queryOptions.populate) {
      if (typeof queryOptions.populate === 'string') {
        let populate = queryOptions.populate.split(',')
        queryOptions.populate = []

        for (let i = 0, length = populate.length; i < length; i++) {
          queryOptions.populate.push({
            path: populate[i]
          })

          for (let key in queryOptions.select) {
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
            } else if (Object.keys(queryOptions.select).length === 0) {
              delete queryOptions.select
            }
          }
        }
      } else if (!Array.isArray(queryOptions.populate)) {
        queryOptions.populate = [queryOptions.populate]
      }
    }

    return queryOptions
  }

  return function (req, res, next) {
    const whitelist = ['distinct', 'limit', 'populate', 'query', 'select', 'skip', 'sort']

    req._ermQueryOptions = {}

    for (let key in req.query) {
      if (whitelist.indexOf(key) === -1) {
        continue
      }

      if (key === 'query') {
        try {
          req._ermQueryOptions[key] = JSON.parse(req.query[key], jsonQueryParser)
        } catch (e) {
          return errorHandler(req, res, next)(new Error(`invalid_json_${key}`))
        }
      } else if (key === 'populate' || key === 'select' || key === 'sort') {
        try {
          req._ermQueryOptions[key] = JSON.parse(req.query[key])
        } catch (e) {
          req._ermQueryOptions[key] = req.query[key]
        }
      } else if (key === 'limit' || key === 'skip') {
        req._ermQueryOptions[key] = parseInt(req.query[key], 10)
      } else {
        req._ermQueryOptions[key] = req.query[key]
      }
    }

    req._ermQueryOptions = parseQueryOptions(req._ermQueryOptions)

    next()
  }
}
