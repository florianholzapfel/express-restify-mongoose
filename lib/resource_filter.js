var _ = require('lodash')
var excludedMap = {}

module.exports = function (model, filteredKeys) {
  filteredKeys = filteredKeys || {}

  excludedMap[model.modelName] = {
    private: filteredKeys.private || [],
    protected: filteredKeys.protected || []
  }

  if (model.discriminators) {
    for (var modelName in model.discriminators) {
      if (excludedMap[modelName]) {
        excludedMap[model.modelName].private = excludedMap[model.modelName].private.concat(excludedMap[modelName].private)
        excludedMap[model.modelName].protected = excludedMap[model.modelName].protected.concat(excludedMap[modelName].protected)
      }
    }
  }

  function removeValueAtPath (obj, path) {
    var keys = path.split('.')

    for (var i = 0, length = keys.length; i < length; i++) {
      if (_.isArray(obj)) {
        for (var j = 0; j < obj.length; j++) {
          removeValueAtPath(obj[j], keys.slice(1).join('.'))
        }
      } else if (!obj || typeof obj[keys[i]] === 'undefined') {
        return
      }

      if (i < keys.length - 1) {
        obj = obj[keys[i]]
      } else {
        delete obj[keys[i]]
      }
    }
  }

  function getExcluded (access, modelName) {
    if (access === 'private') {
      return []
    }

    var entry = excludedMap[modelName] || {
      private: filteredKeys.private || [],
      protected: filteredKeys.protected || []
    }

    return access === 'protected' ? entry.private : entry.private.concat(entry.protected)
  }

  function getModelAtPath (fullField) {
    var fieldArray = fullField.split('.')
    var currSchema = model.schema
    var modelName
    var schemaPath = ''

    for (var i = 0, length = fieldArray.length; i < length; i++) {
      if (schemaPath.length > 0) {
        schemaPath += '.'
      }

      schemaPath += fieldArray[i]

      if (currSchema.path(schemaPath) && currSchema.path(schemaPath).schema) {
        currSchema = currSchema.path(schemaPath).schema
      }
    }

    if (!currSchema) {
      return
    }

    var path = currSchema.path(fieldArray[fieldArray.length - 1]) || currSchema.path(schemaPath)

    if (!path && !model.discriminators) {
      return
    }

    if (path.caster && path.caster.options) {
      modelName = path.caster.options.ref
    } else if (path.options) {
      modelName = path.options.ref
    }

    return modelName
  }

  function filterItem (item, excluded) {
    if (item instanceof Array) {
      return item.map(function (i) {
        return filterItem(i, excluded)
      })
    }

    if (item && excluded) {
      if (typeof item.toObject === 'function') {
        item = item.toObject()
      }

      for (var i = 0, length = excluded.length; i < length; i++) {
        if (excluded[i].indexOf('.') > 0) {
          removeValueAtPath(item, excluded[i])
        } else {
          delete item[excluded[i]]
        }
      }
    }

    return item
  }

  function filterPopulatedItem (item, opts) {
    if (item instanceof Array) {
      return item.map(function (i) {
        return filterPopulatedItem(i, opts)
      })
    }

    var excluded

    for (var i = 0; i < opts.populate.length; i++) {
      if (!opts.populate[i].path) {
        continue
      }

      excluded = getExcluded(opts.access, getModelAtPath(opts.populate[i].path))

      if (_.has(item, opts.populate[i].path)) {
        filterItem(_.get(item, opts.populate[i].path), excluded)
      } else {
        var pathToArray = opts.populate[i].path.split('.').slice(0, -1).join('.')
        var pathToObject = opts.populate[i].path.split('.').slice(-1).join('.')

        if (_.has(item, pathToArray)) {
          var array = _.get(item, pathToArray)
          filterItem(_.pluck(array, pathToObject), excluded)
        }
      }
    }
  }

  function deleteDeep (item, chunks) {
    var firstChunk = chunks[0]
    var firstValue = item[firstChunk]

    if (chunks.length === 1) {
      delete item[firstChunk]
    } else if (_.isArray(firstValue)) {
      firstValue.forEach(function (prop) {
        deleteDeep(prop, chunks.slice(1))
      })
    } else if (_.isObject(firstValue)) {
      deleteDeep(firstValue, chunks.slice(1))
    }
    return item
  }

  function filterBlacklistedKeys (item, blacklist) {
    blacklist.forEach(function (path) {
      var chunks = path.split('.')
      deleteDeep(item, chunks)
    })
    return item
  }

  this.filterObject = function (resource, opts) {
    opts = _.defaults(opts || {}, {
      access: 'public',
      blacklist: []
    })

    var filtered = filterItem(resource, getExcluded(opts.access, model.modelName))

    filtered = filterBlacklistedKeys(filtered, opts.blacklist)

    if (opts.populate) {
      filterPopulatedItem(filtered, opts)
    }

    return filtered
  }
}
