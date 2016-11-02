const _ = require('lodash')

const privates = new WeakMap()

/**
 * Given an ERMOperation, a field to update, and a new value for the field, return a new
 * ERMOperation with the field updated, without modifying the original ERMOperation.
 *
 * @param {ERMOperation} instance - the ERM instance to immutably update
 * @param {String} field - the field to update
 * @param {*} newValue - the new value for the field
 * @return {ERMOperation}
 */
function updateERMInstanceField (instance, field, newValue) {
  const currentData = privates.get(instance)
  return new ERMOperation(_.extend(
    {},
    currentData,
    {
      [field]: newValue
    }
  ))
}

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
 * @property {Array|Object} result - The result of the operation, if applicable
 * @property {Object} document - If the operation operates on a single document, this gets set
 *
 * @property {Object} query - Object that represents the MongoDB query for the operation
 */
class ERMOperation {
  constructor (data = {}) {
    const validatedData = _.omitBy(
      // Pick only valid properties
      _.pick(
        data,
        [
          'context',
          'accessLevel',
          'statusCode',
          'result',
          'document',
          'query',
          'options',
          'model',
          'excludedMap'
        ]
      ),

      // Then omit keys with falsey values
      value => !value
    )

    privates.set(this, validatedData)
  }

  /**
   * @return {ModelQuery}
   */
  get context () {
    const context = privates.get(this).context

    // If context is set, return a copy of it so no one can mutate our internal state
    return context ? context.toConstructor()() : context
  }

  setContext (newContext) {
    return updateERMInstanceField(this, 'context', newContext)
  }

  /**
   * @return {String}
   */
  get accessLevel () {
    return privates.get(this).accessLevel
  }

  setAccessLevel (newAccessLevel) {
    return updateERMInstanceField(this, 'accessLevel', newAccessLevel)
  }

  /**
   * @return {Array}
   */
  get statusCode () {
    return privates.get(this).statusCode
  }

  setStatusCode (newStatusCode) {
    return updateERMInstanceField(this, 'statusCode', newStatusCode)
  }

  /**
   * @return {Array}
   */
  get result () {
    return privates.get(this).result
  }

  setResult (newResult) {
    return updateERMInstanceField(this, 'result', newResult)
  }

  /**
   * @return {Object}
   */
  get document () {
    return privates.get(this).document
  }

  setDocument (newDocument) {
    return updateERMInstanceField(this, 'document', newDocument)
  }

  /**
   * @return {Object}
   */
  get query () {
    return privates.get(this).query
  }

  setQuery (newQuery) {
    return updateERMInstanceField(this, 'query', newQuery)
  }

  /**
   * @return {Object}
   */
  get options () {
    return privates.get(this).options
  }

  setOptions (newOptions) {
    return updateERMInstanceField(this, 'options', newOptions)
  }

  /**
   * @return {Model}
   */
  get model () {
    return privates.get(this).model
  }

  setModel (newModel) {
    return updateERMInstanceField(this, 'model', newModel)
  }

  /**
   * @return {Object}
   */
  get excludedMap () {
    return privates.get(this).excludedMap
  }

  setExcludedMap (newExcludedMap) {
    return updateERMInstanceField(this, 'excludedMap', newExcludedMap)
  }

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
ERMOperation.deserializeFromRequest = function (req) {
  const reqErm = req.erm || {}

  return new ERMOperation({
    model: reqErm.model,
    statusCode: reqErm.statusCode,
    result: reqErm.result,
    document: reqErm.document,

    accessLevel: req.access,

    query: req._ermQueryOptions,
    context: req._ermContext,
    options: req._ermOptions,
    excludedMap: req._ermExcludedMap
  })
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
  if (_.isUndefined(model)) {
    throw new Error('You must supply a model')
  }

  if (_.isUndefined(options)) {
    throw new Error('You must supply options')
  }

  if (_.isUndefined(excludedMap)) {
    throw new Error('You must supply an excludedMap')
  }

  return new ERMOperation({
    model, options, excludedMap
  })
}

module.exports = ERMOperation
