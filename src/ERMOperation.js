const _ = require('lodash')
const ImmutableRecord = require('immutable-record')
const Model = require('mongoose').Model

// Underlying record for the Operation class
const OperationRecord = ImmutableRecord({
  context: {
    type: 'object'
  },

  accessLevel: {
    type: 'string'
  },

  statusCode: {
    type: 'number'
  },

  totalCount: {
    type: 'number'
  },

  result: {},

  document: {
    type: 'object'
  },

  query: {
    type: 'object'
  },

  options: {
    type: 'object'
  },

  model: {
    type: isModel
  },

  excludedMap: {
    type: 'object'
  }
}, 'ERMOperation')

/**
 * An immutable data structure that represents an in-progress ERM operation.
 *
 * @property {Object} model - The mongoose Model we're operating on
 * @property {Object} options - Consumer-specified options
 * @property {Object} excludedMap - Descendant keys to filter out
 * @property {ModelQuery} context - Mongoose query to search
 * @property {String} accessLevel - The permissions granted to whoever is doing the operation
 *
 * @property {Number} statusCode - The HTTP status code of the operation, if finished
 * @property {Number} totalCount - Total count of documents in the operation, if finished
 * @property {Array|Object} result - The result of the operation, if applicable
 * @property {Object} document - If the operation operates on a single document, this gets set
 *
 * @property {Object} query - Object that represents the MongoDB query for the operation
 *
 * @property serializeToRequest
 * @property set
 * @property remove
 */
class ERMOperation extends OperationRecord {
  /**
   * Return an object that can be stored on an Express request object to persist ERMOperation
   * state in between middleware.
   *
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
 * @property {Object} model - The mongoose Model we're operating on
 * @property {Object} options - Consumer-specified options
 * @property {Object} excludedMap - Descendant keys to filter out
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
