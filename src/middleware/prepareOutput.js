import * as _ from 'lodash'
import * as async from 'async'

module.exports = function (options, excludedMap) {
  return function (req, res, next) {
    let postMiddleware

    switch (req.method.toLowerCase()) {
      case 'get':
        postMiddleware = options.postRead
        break
      case 'post':
        if (req.erm.statusCode === 201) {
          postMiddleware = options.postCreate
        } else {
          postMiddleware = options.postUpdate
        }
        break
      case 'put':
      case 'patch':
        postMiddleware = options.postUpdate
        break
      case 'delete':
        postMiddleware = options.postDelete
        break
    }

    async.eachSeries(postMiddleware, (middleware, cb) => {
      middleware(req, res, cb)
    }, err => {
      if (err) {
        return options.onError(err, req, res, next)
      }

      // TODO: this will, but should not, filter /count queries
      if (req.erm.result) {
        let opts = {
          access: req.access,
          excludedMap: excludedMap,
          populate: req._ermQueryOptions ? req._ermQueryOptions.populate : null
        }

        req.erm.result = options.filter ? options.filter.filterObject(req.erm.result, opts) : req.erm.result
      }

      if (options.totalCountHeader && req.erm.totalCount) {
        res.header(_.isString(options.totalCountHeader) ? options.totalCountHeader : 'X-Total-Count', req.erm.totalCount)
      }

      options.outputFn(req, res, {
        result: req.erm.result,
        statusCode: req.erm.statusCode
      })

      if (options.postProcess) {
        options.postProcess(req, res, next)
      }
    })
  }
}
