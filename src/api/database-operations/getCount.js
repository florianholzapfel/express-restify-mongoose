// const APIMethod = require('../../APIMethod')

/**
 * Given a model and erm options, returns Express middleware that builds a mongoose query to
 * count the total number of documents, executes the request, and then stores the count in
 * the request.
 *
 * @param {Object} model
 * @param {Object} options
 * @return {function(*=, *=, *=)}
 */
function getCountMiddleware (model, options) {
  const buildQuery = require('../../buildQuery')(options)
  const errorHandler = require('../../errorHandler')(options)

  return (req, res, next) => {
    options.contextFilter(model, req, (filteredContext) => {
      buildQuery(filteredContext.count().toConstructor()(), req._ermQueryOptions).then((count) => {
        req.erm.result = { count: count }
        req.erm.statusCode = 200

        next()
      }, errorHandler(req, res, next))
    })
  }
}

// function getCount (queryOptions, mongooseContext, query) {
//
// }

module.exports = getCountMiddleware
