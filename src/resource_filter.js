'use strict'

const defaults = require('lodash.defaults')
const detective = require('mongoose-detective')
const get = require('lodash.get')
const has = require('lodash.has')
const isPlainObject = require('lodash.isplainobject')
const map = require('lodash.map')
const weedout = require('weedout')

/**
 * Represents a filter.
 * @constructor
 * @param {Object} opts - Options
 * @param {Object} opts.model - Mongoose model
 * @param {Object} opts.excludedMap {} - Filtered keys for related models
 * @param {Object} opts.filteredKeys {} - Keys to filter for the current model
 */
function Filter (opts) {
  this.model = opts.model

  this.filteredKeys = isPlainObject(opts.filteredKeys) ? {
    private: opts.filteredKeys.private || [],
    protected: opts.filteredKeys.protected || []
  } : {
    private: [],
    protected: []
  }

  if (this.model && this.model.discriminators && isPlainObject(opts.excludedMap)) {
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
 * @memberof Filter
 * @param {Object} - Options.
 * @param {String} opts.access {public} - Access level (private, protected or public).
 * @param {Object} opts.excludedMap {} - Filtered keys for related models
 * @param {Object} opts.filteredKeys {} - Keys to filter for the current model
 * @returns {Array} - Keys to filter.
 */
Filter.prototype.getExcluded = function (opts) {
  if (opts.access === 'private') {
    return []
  }

  let entry = opts.excludedMap && opts.modelName ? opts.excludedMap[opts.modelName] : null

  if (!entry) {
    entry = isPlainObject(opts.filteredKeys) ? {
      private: opts.filteredKeys.private || [],
      protected: opts.filteredKeys.protected || []
    } : {
      private: [],
      protected: []
    }
  }

  return opts.access === 'protected' ? entry.private : entry.private.concat(entry.protected)
}

Filter.prototype.isExcluded = function (field, opts) {
  if (!field) {
    return false
  }

  opts = defaults(opts, {
    access: 'public',
    excludedMap: {},
    filteredKeys: this.filteredKeys,
    modelName: this.model.modelName
  })

  return this.getExcluded(opts).indexOf(field) >= 0
}

/**
 * Removes excluded keys from a document.
 * @memberof Filter
 * @param {Object} - Source document.
 * @param {Array} - Keys to filter.
 * @returns {Object} - Filtered document.
 */
Filter.prototype.filterItem = function (item, excluded) {
  if (Array.isArray(item)) {
    return item.map((i) => this.filterItem(i, excluded))
  }

  if (item && excluded) {
    if (typeof item.toObject === 'function') {
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
 * @param {Object} - Source document.
 * @param {Object} - Keys to filter.
 * @param {Array} opts.populate - Paths to populated subdocuments.
 * @param {String} opts.access - Access level (private, protected or public).
 * @param {Object} opts.excludedMap {} - Filtered keys for related models
 * @returns {Object} - Filtered document.
 */
Filter.prototype.filterPopulatedItem = function (item, opts) {
  if (Array.isArray(item)) {
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

    if (has(item, opts.populate[i].path)) {
      this.filterItem(get(item, opts.populate[i].path), excluded)
    } else {
      const pathToArray = opts.populate[i].path.split('.').slice(0, -1).join('.')

      if (has(item, pathToArray)) {
        const array = get(item, pathToArray)
        const pathToObject = opts.populate[i].path.split('.').slice(-1).join('.')

        this.filterItem(map(array, pathToObject), excluded)
      }
    }
  }

  return item
}

/**
 * Removes excluded keys from a document.
 * @memberof Filter
 * @access public
 * @param {Object} - Source document.
 * @param {Object} - Options.
 * @param {String} opts.access {public} - Access level (private, protected or public).
 * @param {Object} opts.excludedMap {} - Filtered keys for related models
 * @param {Array} opts.populate - Paths to populated subdocuments.
 * @returns {Object} - Filtered document.
 */
Filter.prototype.filterObject = function (resource, opts) {
  opts = defaults(opts || {}, {
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
