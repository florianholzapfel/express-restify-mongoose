'use strict'

const runSeries = require('run-series')

module.exports = function (options, excludedMap) {
  const errorHandler = require('../errorHandler')(options)

  return function (req, res, next) {
    const postMiddleware = (() => {
      switch (req.method.toLowerCase()) {
        case 'get':
          return options.postRead
        case 'post':
          if (req.erm.statusCode === 201) {
            return options.postCreate
          }

          return options.postUpdate
        case 'put':
        case 'patch':
          return options.postUpdate
        case 'delete':
          return options.postDelete
      }
    })()

    const callback = (err) => {
      if (err) {
        return errorHandler(req, res, next)(err)
      }

      // TODO: this will, but should not, filter /count queries
      if (req.erm.result) {
        const opts = {
          access: req.access,
          excludedMap: excludedMap,
          populate: req.erm && req.erm.query ? req.erm.query.populate : null
        }

        req.erm.result = options.filter ? options.filter.filterObject(req.erm.result, opts) : req.erm.result
      }

      if (options.totalCountHeader && req.erm.totalCount) {
        res.header(typeof options.totalCountHeader === 'string' ? options.totalCountHeader : 'X-Total-Count', req.erm.totalCount)
      }

      const promise = options.outputFn(req, res)

      if (options.postProcess) {
        if (promise && typeof promise.then === 'function') {
          promise.then(() => {
            options.postProcess(req, res)
          }).catch(errorHandler(req, res, next))
        } else {
          options.postProcess(req, res)
        }
      }
    }

    if (!postMiddleware || postMiddleware.length === 0) {
      return callback()
    }

    runSeries(postMiddleware.map((middleware, i) => {
      return (cb) => {
        middleware(req, res, cb)
      }
    }), callback)
  }
}
