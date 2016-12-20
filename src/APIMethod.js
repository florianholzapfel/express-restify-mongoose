const _ = require('lodash')
const ERMOperation = require('./ERMOperation')

const privates = new WeakMap()

/**
 * An APIMethod is a Promise-based operation with two components:
 *
 * 1) an "operation", a function that takes arbitrary input and can resolve to anything
 *
 * 2) a "bound operation" (doOperationWithRequest) that takes an ERMOperation and an Express
 *    request as input and returns a Promise that resolves to an ERMOperation
 *
 * APIMethods can be converted to Express middleware that automatically handles serializing
 * ERMOperations to and from the Express request
 */
class APIMethod {
  /**
   * @param {function: Promise} operation
   * @param {function(ERMOperation, Object): Promise<ERMOperation>} doOperationWithRequest
   */
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

  /**
   * Given an initial ERMOperation (to grab options from), returns Express middleware that does
   * the following:
   *  - Deserialize the current ERMOperation state from the request
   *  - Run the operation (using the request)
   *  - Serialize the resultant ERMOperation back to the request
   *
   * This middleware is "atomic" in the sense that the request shouldn't be mutated (if the
   * operation is well-behaved) until the operation is finished running.
   *
   * @param {ERMOperation} initialState - initial ERM operation state used to generate the middleware - just needs to have "options" set
   * @return {function(*=, *=, *=)}
   */
  getMiddleware (initialState) {
    const errorHandler = require('./errorHandler')(initialState.options)

    return (req, res, next) => {
      // Grab the current operation state from the request
      const currentState = ERMOperation.deserializeRequest(req)

      // Do the operation. The operation returns a Promise, and whatever it resolves to will get
      // added to the request.
      this.doOperationWithRequest(currentState, req)
        .then(resultState => {
          // Add the result to the request object for the next middleware in the stack
          _.merge(req, resultState.serializeToRequest())

          return next()
        })
        .catch(errorHandler(req, res, next))
    }
  }
}

module.exports = APIMethod
