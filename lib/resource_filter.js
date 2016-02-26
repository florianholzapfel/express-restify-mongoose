var _ = require('lodash')
var detective = require('mongoose-detective')
var weedout = require('weedout')

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

  this.filteredKeys = _.isPlainObject(opts.filteredKeys) ? {
    private: opts.filteredKeys.private || [],
    protected: opts.filteredKeys.protected || []
  } : {
    private: [],
    protected: []
  }

  if (this.model && this.model.discriminators && _.isPlainObject(opts.excludedMap)) {
    for (var modelName in this.model.discriminators) {
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

  var entry = opts.excludedMap && opts.modelName ? opts.excludedMap[opts.modelName] : null

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
 * Removes excluded keys from a document.
 * @memberof Filter
 * @param {Object} - Source document.
 * @param {Array} - Keys to filter.
 * @returns {Object} - Filtered document.
 */
Filter.prototype.filterItem = function (item, excluded) {
  var self = this

  if (item instanceof Array) {
    return item.map(function (i) {
      return self.filterItem(i, excluded)
    })
  }

  if (item && excluded) {
    if (typeof item.toObject === 'function') {
      item = item.toObject()
    }

    for (var i = 0, length = excluded.length; i < length; i++) {
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
  var self = this

  if (item instanceof Array) {
    return item.map(function (i) {
      return self.filterPopulatedItem(i, opts)
    })
  }

  var excluded

  for (var i = 0; i < opts.populate.length; i++) {
    if (!opts.populate[i].path) {
      continue
    }

    excluded = self.getExcluded({
      access: opts.access,
      excludedMap: opts.excludedMap,
      modelName: detective(self.model, opts.populate[i].path)
    })

    if (_.has(item, opts.populate[i].path)) {
      self.filterItem(_.get(item, opts.populate[i].path), excluded)
    } else {
      var pathToArray = opts.populate[i].path.split('.').slice(0, -1).join('.')
      var pathToObject = opts.populate[i].path.split('.').slice(-1).join('.')

      if (_.has(item, pathToArray)) {
        var array = _.get(item, pathToArray)
        self.filterItem(_.map(array, pathToObject), excluded)
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
  var self = this

  opts = _.defaults(opts || {}, {
    access: 'public',
    excludedMap: {},
    filteredKeys: self.filteredKeys,
    modelName: self.model.modelName
  })

  var filtered = self.filterItem(resource, self.getExcluded(opts))

  if (opts.populate) {
    self.filterPopulatedItem(filtered, opts)
  }

  return filtered
}

module.exports = Filter
