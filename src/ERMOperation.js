/**
 * @module './ERMOperation'
 */

const ImmutableRecord = require('immutable-record')
const _ = require('lodash')
const Model = require('mongoose').Model

/**
 * Underlying record for the Operation class
 */
const OperationRecord = ImmutableRecord(
  /** @lends ERMOperation */
  {
    /**
     * Query representing the document(s) we want to operate on
     * @alias module:ERMOperation#context
     * @type {function|Object}
     */
    context: {
      type: ctx => _.isFunction(ctx) || _.isObject(ctx)
    },

    /**
     * The permissions granted to whoever is doing the operation
     * @alias module:ERMOperation#accessLevel
     * @type {String}
     */
    accessLevel: {
      type: 'string'
    },

    /**
     * The HTTP status code of the operation, if finished
     * @alias module:ERMOperation#statusCode
     * @type {Number}
     */
    statusCode: {
      type: 'number'
    },

    /**
     * Total count of documents in the operation, if finished
     * @alias module:ERMOperation#totalCount
     * @type {Number}
     */
    totalCount: {
      type: 'number'
    },

    /**
     * The result of the operation, if applicable
     * @alias module:ERMOperation#result
     * @type {Array|Object}
     */
    result: {},

    /**
     * If the operation operates on a single document, this gets set
     * @alias module:ERMOperation#document
     * @type {Object}
     */
    document: {
      type: 'object'
    },

    /**
     * Object that represents the MongoDB query for the operation
     * @alias module:ERMOperation#query
     * @type {Object}
     */
    query: {
      type: 'object'
    },

    /**
     * Top-level ERM options for the operation.
     * @alias module:ERMOperation#options
     * @type {Object}
     */
    options: {
      type: 'object',
      required: true
    },

    /**
     * The mongoose Model we're operating on
     * @alias module:ERMOperation#model
     * @type {mongoose.Model}
     */
    model: {
      type: isModel,
      required: true
    },

    /**
     * Descendant keys to filter out
     * @alias module:ERMOperation#excludedMap
     * @type {Object}
     */
    excludedMap: {
      type: 'object',
      required: true
    }
  },
  'ERMOperation'
)

/**
 * An immutable data structure that represents an in-progress ERM operation.
 * @alias module:ERMOperation
 * @class
 */
class ERMOperation extends OperationRecord {

  /**
   * Return an object that can be stored on an Express request object to persist ERMOperation
   * state in between middleware.
   *
   * @alias module:ERMOperation#serializeToRequest
   * @return {Object}
   */
  serializeToRequest () {
    return {
      erm: {
        model: this.model,
        statusCode: this.statusCode,
        totalCount: this.totalCount,
        result: this.result,
        document: this.document
      },

      access: this.accessLevel,

      _ermQueryOptions: this.query,
      _ermContext: this.context,
      _ermOptions: this.options,
      _ermExcludedMap: this.excludedMap
    }
  }
}

/**
 * Given an Express request, deserializes an ERMOperation from it.
 *
 * @alias module:ERMOperation.deserializeRequest
 *
 * @param {Object} req - the Express request
 * @return {ERMOperation}
 */
ERMOperation.deserializeRequest = function (req) {
  const reqErm = req.erm || {}

  return new ERMOperation(
    _.omitBy({
      model: reqErm.model,
      statusCode: reqErm.statusCode,
      totalCount: reqErm.totalCount,
      result: reqErm.result,
      document: reqErm.document,

      accessLevel: req.access,

      query: req._ermQueryOptions,
      context: req._ermContext,
      options: req._ermOptions,
      excludedMap: req._ermExcludedMap
    }, _.isUndefined)
  )
}

/**
 * Initialize a new ERMOperation with a model, options, and an excludedMap.
 * All parameters are required.
 *
 * @alias module:ERMOperation.initialize
 *
 * @param {Object} model - The mongoose Model we're operating on
 * @param {Object} options - Consumer-specified options
 * @param {Object} excludedMap - Descendant keys to filter out
 *
 * @return {ERMOperation}
 */
ERMOperation.initialize = function (model, options, excludedMap) {
  return new ERMOperation({
    model, options, excludedMap
  })
}

/**
 * Returns true if the argument is a mongoose Model.
 * @param {Object} model
 * @return {boolean}
 */
function isModel (model) {
  return Object.getPrototypeOf(model) === Model
}

module.exports = ERMOperation
