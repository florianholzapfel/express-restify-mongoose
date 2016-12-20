const _ = require('lodash')
const Promise = require('bluebird')
const isCoordinates = require('is-coordinates')

function parseQueryOptions (queryOptions) {
  if (queryOptions.select && _.isString(queryOptions.select)) {
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
    if (_.isString(queryOptions.populate)) {
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
    } else if (!_.isArray(queryOptions.populate)) {
      queryOptions.populate = [queryOptions.populate]
    }
  }

  return queryOptions
}

/**
 * Custom JSON string parser that turns a query string into an Object.
 *
 * Usage:
 *    const fooQueryObject = JSON.parse(queryString.foo, jsonQueryParser)
 *
 * @param {boolean} [allowRegex] false - whether regex options are allowed in the query string
 * @return {function(*, *=)} - JSON.parse() custom parser
 */
function jsonQueryParser (allowRegex) {
  return (key, value) => {
    if (key === '$regex' && !allowRegex) {
      return undefined
    }

    if (_.isString(value)) {
      if (value[0] === '~') { // parse RegExp
        return allowRegex ? new RegExp(value.substr(1), 'i') : undefined
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
    } else if (_.isArray(value) && key[0] !== '$' && key !== 'coordinates' && !isCoordinates(value)) {
      return { $in: value }
    }

    return value
  }
}

const QUERY_OPTIONS_WHITELIST = Object.freeze(
  ['distinct', 'limit', 'populate', 'query', 'select', 'skip', 'sort']
)

/**
 * Given erm options, returns a function that takes a query string object (e.g. in Express
 * middleware, req.query), parses it, and resolves to the parsed erm query options.
 *
 * The Promise is rejected if the query string has invalid an invalid 'query' value.
 *
 * @param {boolean} allowRegex - whether or not regular expressions are allowed in the query string
 * @return {function(Object): function(Object): Promise}
 */
module.exports = function (allowRegex) {
  return function (queryStringObject = {}) {
    return new Promise((resolve, reject) => {
      const baseQueryOptions = {}

      for (let key in queryStringObject) {
        if (QUERY_OPTIONS_WHITELIST.indexOf(key) === -1) {
          continue
        }

        if (key === 'query') {
          try {
            baseQueryOptions[key] = JSON.parse(
              queryStringObject[key],
              jsonQueryParser(allowRegex)
            )
          } catch (e) {
            return reject(new Error(`invalid_json_${key}`))
          }
        } else if (key === 'populate' || key === 'select' || key === 'sort') {
          try {
            baseQueryOptions[key] = JSON.parse(queryStringObject[key])
          } catch (e) {
            baseQueryOptions[key] = queryStringObject[key]
          }
        } else if (key === 'limit' || key === 'skip') {
          baseQueryOptions[key] = parseInt(queryStringObject[key], 10)
        } else {
          baseQueryOptions[key] = queryStringObject[key]
        }
      }

      const parsedOptions = parseQueryOptions(baseQueryOptions)

      return resolve(parsedOptions)
    })
  }
}
