const isDistinctExcluded = require('./shared').isDistinctExcluded
const _ = require('lodash')

/**
 * Given a model, erm options, and a list of excluded keys for model descendants, returns
 * Express middleware that builds a mongoose query to retrieve _all_ items that match the query,
 * executes the query, and stores the result (an array) in the request.
 *
 * @param {Object} model
 * @param {Object} options
 * @param {Object} excludedMap
 * @return {function(*=, *=, *=)}
 */
function getItems (model, options, excludedMap) {
  const buildQuery = require('../buildQuery')(options)
  const errorHandler = require('../errorHandler')(options)

  return (req, res, next) => {
    if (isDistinctExcluded(options.filter, excludedMap, req)) {
      req.erm.result = []
      req.erm.statusCode = 200
      return next()
    }

    options.contextFilter(model, req, (filteredContext) => {
      buildQuery(filteredContext.find(), req._ermQueryOptions).then((items) => {
        req.erm.result = items
        req.erm.statusCode = 200

        if (options.totalCountHeader && !req._ermQueryOptions['distinct']) {
          options.contextFilter(model, req, (countFilteredContext) => {
            buildQuery(countFilteredContext.count(), _.assign(req._ermQueryOptions, {
              skip: 0,
              limit: 0
            })).then((count) => {
              req.erm.totalCount = count
              next()
            }, errorHandler(req, res, next))
          })
        } else {
          next()
        }
      }, errorHandler(req, res, next))
    })
  }
}

module.exports = getItems
