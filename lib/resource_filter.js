var _ = require('lodash')
var excludedMap = {}

module.exports = function (model, filteredKeys) {
  filteredKeys = filteredKeys || {}

  excludedMap[model.modelName] = {
    'private': filteredKeys.private || [],
    'protected': filteredKeys.protected || []
  }

  function getValueAtPath (obj, path) {
    var keys = path.split('.')
    var temp = []

    for (var i = 0, length = keys.length; i < length; i++) {
      if (!obj) {
        return
      }

      if (_.isArray(obj)) {
        for (var j = 0; j < obj.length; j++) {
          temp.push(getValueAtPath(obj[i], keys.slice(i).join('.')))
        }

        return temp
      }

      if (!obj[keys[i]]) {
        return
      }

      obj = obj[keys[i]]
    }

    return obj
  }

  function removeValueAtPath (obj, path) {
    var keys = path.split('.')

    for (var i = 0, length = keys.length; i < length; i++) {
      if (!obj) {
        return
      }

      if (_.isArray(obj)) {
        for (var j = 0; j < obj.length; j++) {
          if (keys.length === 1) {
            removeValueAtPath(obj[j], keys[i])
          } else {
            removeValueAtPath(obj[j], keys.slice(1).join('.'))
          }
        }
      } else if (!obj[keys[i]]) {
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
      'private': filteredKeys.private || [],
      'protected': filteredKeys.protected || []
    }

    return access === 'protected' ? entry.private : entry.private.concat(entry.protected)
  }

  function getModelAtPath (fullField, access) {
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

    for (var i = 0; i < opts.populate.length; i++) {
      if (!opts.populate[i].path) {
        continue
      }

      filterItem(getValueAtPath(item, opts.populate[i].path), getExcluded(opts.access, getModelAtPath(opts.populate[i].path)))
    }
  }

  this.filterObject = function (resource, opts) {
    opts = _.defaults(opts || {}, {
      access: 'public'
    })

    var filtered = filterItem(resource, getExcluded(opts.access, model.modelName))

    if (opts.populate) {
      filterPopulatedItem(filtered, opts)
    }

    return filtered
  }
}
