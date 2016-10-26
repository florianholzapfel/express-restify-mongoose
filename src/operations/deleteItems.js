/**
 * Given a model and erm options, returns Express middleware that builds a mongoose query to
 * delete items from the database and executes it.
 *
 * @param {Object} model
 * @param {Object} options
 * @return {function(*=, *=, *=)}
 */
function deleteItems (model, options) {
  const buildQuery = require('../buildQuery')(options)
  const errorHandler = require('../errorHandler')(options)

  return (req, res, next) => {
    options.contextFilter(model, req, (filteredContext) => {
      buildQuery(filteredContext.remove(), req._ermQueryOptions).then(() => {
        req.erm.statusCode = 204

        next()
      }, errorHandler(req, res, next))
    })
  }
}

module.exports = deleteItems
