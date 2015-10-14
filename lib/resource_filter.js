'use strict'

var util = require('util')
var _ = require('lodash')
var excludedMap = {}

function filterFn (head) {
  return function (ex) {
    return ex.indexOf(head + '.') === 0
  }
}

function mapFn (head) {
  return function (ex) {
    return ex.replace(head + '.', '')
  }
}

function shaveHeads (arr, head) {
  return arr.filter(filterFn(head)).map(mapFn(head))
}

module.exports = function (model, filteredKeys) {
  filteredKeys = filteredKeys || {}

  excludedMap[model.modelName] = {
    'private': filteredKeys.private || [],
    'protected': filteredKeys.protected || []
  }

  var getExcluded = this.getExcluded = function (access, modelName) {
    if (access === 'private') {
      return []
    }

    var entry = excludedMap[modelName] || {
      'private': filteredKeys.private || [],
      'protected': filteredKeys.protected || []
    }

    return access === 'protected' ? entry.private : entry.private.concat(entry.protected)
  }

  function filterItem (item, customExclude) {
    // just deleting the excluded keys from item does
    // not modify the object. therefore we build a copy
    var newExcluded
    var excluded = customExclude

    if (!item) {
      return item
    }

    excluded.forEach(function (key) {
      if (key.indexOf('.') > 0) {
        var head = key.split('.')[0]
        if (!item[head]) {
          return
        }

        newExcluded = shaveHeads(excluded, head)
        item[head] = filterItems(item[head], newExcluded)
      } else {
        delete item[key]
      }
    })

    return item
  }

  function filterItems (items, customExclude) {
    if (items instanceof Array) {
      return items.map(function (item) {
        if (item && item.toObject) {
          item = item.toObject()
        }

        return filterItem(item, customExclude)
      })
    } else {
      if (items && items.toObject) {
        items = items.toObject()
      }

      return filterItem(items, customExclude)
    }
  }

  function findExcludedFieldsFor (fullField, access) {
    var fieldArray = fullField.split('.')
    var prefix = fieldArray.slice(1).join('.')
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

    if (!path) {
      if (model.discriminators) {
        _.each(model.discriminators, function (d) {
          if (path) {
            return
          }

          path = d.schema.path(fieldArray[fieldArray.length - 1])
        })
      } else {
        return
      }
    }

    if (path.caster && path.caster.options) {
      modelName = path.caster.options.ref
    } else if (path.options) {
      modelName = path.options.ref
    }

    if (!modelName || !excludedMap[modelName]) {
      return
    }

    var excluded = prefix === '' ? getExcluded(access, modelName) : getExcluded(access, modelName).map(function (ex) {
      return util.format('%s.%s', prefix, ex)
    })

    return excluded
  }

  function filterPopulated (resource, opts) {
    if (!opts.populate) {
      return
    }

    var excludedKeys
    var popFields
    var filterPath

    for (var i = 0; i < opts.populate.length; i++) {
      if (!opts.populate[i].path) {
        continue
      }

      popFields = opts.populate[i].path.split('.')
      excludedKeys = findExcludedFieldsFor(opts.populate[i].path, opts.access)

      if (!excludedKeys) {
        continue
      }

      if (popFields.length > 1) {
        filterPath = opts.populate[i].path.split('.').slice(0, -1).join('.')
      } else {
        filterPath = opts.populate[i].path
      }

      filterItems(resource[filterPath], excludedKeys)
    }
  }

  this.filterObject = function (resource, opts) {
    opts = _.defaults(opts || {}, {
      access: 'public'
    })

    var excludedKeys = getExcluded(opts.access)
    var filtered = filterItems(resource, excludedKeys)

    if (filtered instanceof Array) {
      filtered.forEach(function (item) {
        filterPopulated(item, opts)
      })
    } else {
      filterPopulated(filtered, opts)
    }

    return filtered
  }
}
