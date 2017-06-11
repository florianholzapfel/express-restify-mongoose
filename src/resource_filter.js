const _ = require('lodash')
const detective = require('mongoose-detective')
const weedout = require('weedout')

/**
 * A wrapper around a Mongoose model that exposes utilities for filtering document keys
 * based on various filter criteria.
 *
 * @constructor
 * @param {Object} opts - Options
 * @param {Object} opts.model - Base Mongoose model
 * @param {Object} opts.excludedMap {} - Filtered keys for related models (i.e. models that inherit from the base model)
 * @param {Object} opts.filteredKeys {} - Keys to filter for the base model.
 * @param {Array<String>} opts.filteredKeys.private [] - The base model's private keys.
 * @param {Array<String>} opts.filteredKeys.protected [] - The base model's protected keys.
 */
function Filter (opts) {
  this.model = opts.model

  this.filteredKeys = _.isPlainObject(opts.filteredKeys) ? {
    private: opts.filteredKeys.private || [],
    protected: opts.filteredKeys.protected || []
  } : {
    private: [],
    protected: []
  }

  if (this.model && this.model.discriminators && _.isPlainObject(opts.excludedMap)) {
    for (let modelName in this.model.discriminators) {
      if (opts.excludedMap[modelName]) {
        this.filteredKeys.private = this.filteredKeys.private.concat(opts.excludedMap[modelName].private)
        this.filteredKeys.protected = this.filteredKeys.protected.concat(opts.excludedMap[modelName].protected)
      }
    }
  }
}

/**
 * Gets excluded keys for a given model and access.
 *
 * If opts.modelName is not provided, returns the excluded keys of the Filter's base model.
 *
 * @memberof Filter
 * @param {Object} opts - Options.
 *
 * @param {String} opts.access {public} - Access level (private, protected or public).
 * @param {Object} opts.filteredKeys {} - Keys to filter for the current model
 *
 * @param {Object} [opts.excludedMap] {} - A mapping of descendant model names to excluded keys for the descendant models
 * @param {String} [opts.modelName] - The model name of a descendant document
 *
 * @returns {Array} - Keys to filter.
 */
Filter.prototype.getExcluded = function (opts) {
  if (opts.access === 'private') {
    return []
  }

  let entry = opts.excludedMap && opts.modelName ? opts.excludedMap[opts.modelName] : null

  if (!entry) {
    entry = _.isPlainObject(opts.filteredKeys) ? {
      private: opts.filteredKeys.private || [],
      protected: opts.filteredKeys.protected || []
    } : {
      private: [],
      protected: []
    }
  }

  return opts.access === 'protected' ? entry.private : entry.private.concat(entry.protected)
}

/**
 * Gets excluded keys for a given model and access.
 *
 * @memberof Filter
 *
 * @param {String} field - the field to check
 *
 * @param {Object} opts - Options.
 * @param {String} opts.access {public} - Access level (private, protected or public).
 * @param {Object} opts.excludedMap {} - Filtered keys for related models
 * @param {Object} opts.filteredKeys {} - Keys to filter for the current model
 *
 * @returns {boolean} - will the field be excluded
 */
Filter.prototype.isExcluded = function (field, opts) {
  if (!field) {
    return false
  }

  opts = _.defaults(opts, {
    access: 'public',
    excludedMap: {},
    filteredKeys: this.filteredKeys,
    modelName: this.model.modelName
  })

  return this.getExcluded(opts).indexOf(field) >= 0
}

/**
 * Given a document and a list of keys to exclude, removes the keys
 * from the document.
 *
 * @memberof Filter
 * @param {Object} item - Source document.
 * @param {Array} excluded - Keys to remove from the document.
 * @returns {Object} - Filtered document.
 */
Filter.prototype.filterItem = function (item, excluded) {
  if (_.isArray(item)) {
    return item.map((i) => this.filterItem(i, excluded))
  }

  if (item && excluded) {
    if (_.isFunction(item.toObject)) {
      item = item.toObject()
    }

    for (let i = 0, length = excluded.length; i < length; i++) {
      if (excluded[i].indexOf('.') > 0) {
        weedout(item, excluded[i])
      } else {
        delete item[excluded[i]]
      }
    }
  }

  return item
}

/**
 * Removes excluded keys from a document with populated subdocuments.
 * @memberof Filter
 * @param {Object} item - Source document.
 * @param {Object} opts - Keys to filter.
 * @param {Array} opts.populate - Paths to populated subdocuments.
 * @param {String} opts.access - Access level (private, protected or public).
 * @param {Object} opts.excludedMap {} - Filtered keys for related models
 * @returns {Object} - Filtered document.
 */
Filter.prototype.filterPopulatedItem = function (item, opts) {
  if (_.isArray(item)) {
    return item.map((i) => this.filterPopulatedItem(i, opts))
  }

  for (let i = 0; i < opts.populate.length; i++) {
    if (!opts.populate[i].path) {
      continue
    }

    const excluded = this.getExcluded({
      access: opts.access,
      excludedMap: opts.excludedMap,
      modelName: detective(this.model, opts.populate[i].path)
    })

    if (_.has(item, opts.populate[i].path)) {
      this.filterItem(_.get(item, opts.populate[i].path), excluded)
    } else {
      const pathToArray = opts.populate[i].path.split('.').slice(0, -1).join('.')

      if (_.has(item, pathToArray)) {
        const array = _.get(item, pathToArray)
        const pathToObject = opts.populate[i].path.split('.').slice(-1).join('.')

        this.filterItem(_.map(array, pathToObject), excluded)
      }
    }
  }

  return item
}

/**
 * Removes excluded keys from a document.
 *
 * @memberof Filter
 * @access public
 * @param {Object} resource - Source document.
 * @param {Object} opts - Options.
 * @param {String} opts.access {public} - Access level (private, protected or public).
 * @param {Object} [opts.excludedMap] {} - Filtered keys for related models
 * @param {Array} opts.populate - Paths to populated subdocuments.
 * @returns {Object} - Filtered document.
 */
Filter.prototype.filterObject = function (resource, opts = {}) {
  opts = _.defaults(opts, {
    access: 'public',
    excludedMap: {},
    filteredKeys: this.filteredKeys,
    modelName: this.model.modelName
  })

  let filtered = this.filterItem(resource, this.getExcluded(opts))

  if (opts.populate) {
    this.filterPopulatedItem(filtered, opts)
  }

  return filtered
}

module.exports = Filter
