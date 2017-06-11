const _ = require('lodash')
const async = require('async')
const Promise = require('bluebird')

module.exports = function (options, excludedMap) {
  const errorHandler = require('../errorHandler')(options)

  return function (req, res, next) {
    const postMiddleware = getPostMiddlewareForMethod(options, req.method, req.erm.statusCode) || []

    async.eachSeries(
      postMiddleware,
      (middleware, cb) => middleware(req, res, cb),
      (err) => {
        if (err) {
          return errorHandler(req, res, next)(err)
        }

        // TODO: this will, but should not, filter /count queries
        if (req.erm.result && options.filter) {
          let opts = {
            access: req.access,
            excludedMap: excludedMap,
            populate: req._ermQueryOptions
              ? req._ermQueryOptions.populate
              : null
          }

          req.erm.result = options.filter.filterObject(req.erm.result, opts)
        }

        if (options.totalCountHeader && req.erm.totalCount) {
          const headerName = _.isString(options.totalCountHeader)
            ? options.totalCountHeader
            : 'X-Total-Count'
          res.header(headerName, req.erm.totalCount)
        }

        // For backwards compatibility:
        const asyncOutputFn = options.outputFn.length < 3
          // If the outputFn doesn't take a cb, we just need to wrap it in method()
          ? Promise.method(options.outputFn)
          // If it *does* take a callback, we promisify() it
          : Promise.promisify(options.outputFn)

        const postProcess = options.postProcess || _.noop

        // Any errors in postProcess get passed to the next error handling middleware
        // in the stack, *not* to errorHandler().
        // Errors in outputFn() *do* get passed to errorHandler() -- the outputFn() Promise
        // wrapper is not guaranteed to fulfill, and may reject.
        return asyncOutputFn(req, res)
          .then(() => postProcess(req, res, next))
          .catch(errorHandler(req, res, next))
      }
    )
  }
}

function getPostMiddlewareForMethod (options, method, statusCode) {
  // HACK: we only need the status code because POST is doing double duty
  // for object creation and modification.
  switch (method.toLowerCase()) {
    case 'get':
      return options.postRead

    case 'post':
      return (statusCode === 201)
        ? options.postCreate
        : options.postUpdate

    case 'put':
    case 'patch':
      return options.postUpdate

    case 'delete':
      return options.postDelete
  }
}
