const _ = require('lodash')
const ERMOperation = require('./ERMOperation')

const privates = new WeakMap()

/**
 * An Transformation is a Promise-based operation that accepts an ERMOperation and a Express
 * request and returns a new ERMOperation.
 *
 * Transformations can be converted to Express middleware that automatically handle serializing
 * ERMOperations to and from the Express request.
 */
class Transformation {

  /**
   * @param {function(ERMOperation, module:express.Request): Promise<ERMOperation>} transformation
   */
  constructor (transformation) {
    privates.set(this, transformation)
  }

  /**
   * Given an initial ERMOperation (to grab options from), returns Express middleware that does
   * the following:
   *  - Deserialize the current ERMOperation state from the request
   *  - Run the transformation (using the request)
   *  - Serialize the resultant ERMOperation back to the request
   *
   * This middleware is "atomic" in the sense that the request won't be mutated (if the
   * operation is well-behaved) until the operation is finished running.
   *
   * @param {ERMOperation} initialState - initial ERM operation state - just needs to have "options" set
   * @return {function(*=, *=, *=)}
   */
  getMiddleware (initialState) {
    const errorHandler = require('./errorHandler')(initialState.options)
    const transformation = privates.get(this)

    return (req, res, next) => {
      const currentState = ERMOperation.deserializeRequest(req)

      transformation(currentState, req)
        .then(resultState => {
          // Add the result to the request object for the next middleware in the stack
          _.merge(req, resultState.serializeToRequest())

          return next()
        })
        .catch(errorHandler(req, res, next))
    }
  }

}

/**
 * An APIOperation is a Transformation that isn't able to operate on the Express request.
 * Since APIOperations are completely decoupled from Express/Restify, they can be used
 * in other applications.
 */
class APIOperation extends Transformation {

  /**
   * @param {function(ERMOperation): Promise<ERMOperation>} operation
   */
  constructor (operation) {
    // Make sure the operation gets called with only the current state
    super(_.unary(operation))
  }

  get operation () {
    return privates.get(this)
  }
}

module.exports = { Transformation, APIOperation }
