const _ = require('lodash')

/**
 * A data structure that simplifies passing consumer-specified options and mongoose objects
 * around the application.
 *
 * @param {Object} model - The mongoose model that we're serving
 * @param {Object} options - Consumer-specified options
 * @param {Object} excludedMap - Descendant keys to filter
 * @return {ERMInstance}
 * @constructor
 */
function ERMInstance (model, options, excludedMap) {
  if (_.isUndefined(this)) {
    return new ERMInstance(model, options, excludedMap)
  }

  Object.call(this)
  this.model = model
  this.options = options
  this.excludedMap = excludedMap
}

module.exports = ERMInstance
