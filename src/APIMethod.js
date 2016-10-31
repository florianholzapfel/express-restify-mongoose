const _ = require('lodash')

const privates = new WeakMap()

class APIMethod {
  constructor (operation, doOperationWithRequest) {
    privates.set(this, {
      doOperationWithRequest,
      operation
    })

    this.getMiddleware = this.getMiddleware.bind(this)
  }

  get doOperationWithRequest () {
    return privates.get(this).doOperationWithRequest
  }

  get operation () {
    return privates.get(this).operation
  }

  getMiddleware (ermInstance) {
    const errorHandler = require('./errorHandler')(ermInstance.options)

    return (req, res, next) => {
      // Do the operation. The operation returns a Promise, and whatever it resolves to will get
      // added to the request.
      this.doOperationWithRequest(ermInstance, req)
        .then(result => {
          // Add the result to the request object for the next middleware in the stack
          _.merge(req, result)

          return next()
        })
        .catch(errorHandler(req, res, next))
    }
  }
}

module.exports = APIMethod
