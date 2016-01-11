var _ = require('lodash')
var http = require('http')

module.exports = function (model, options) {
  var buildQuery = require('./buildQuery')(options)

  function findById (filteredContext, id) {
    var byId = {}
    byId[options.idProperty] = id
    return filteredContext.findOne().and(byId)
  }

  function getItems (req, res, next) {
    options.contextFilter(model, req, function (filteredContext) {
      var query = buildQuery(filteredContext.find(), req._ermQueryOptions).read(options.readPreference)

      query.lean(options.lean).exec().then(function (items) {
        req.erm.result = items
        req.erm.statusCode = 200

        if (options.totalCountHeader) {
          query.skip(0).limit(0).count().then(function (count) {
            req.erm.totalCount = count
            next()
          }, function (err) {
            err.statusCode = 400
            options.onError(err, req, res, next)
          })
        } else {
          next()
        }
      }, function (err) {
        err.statusCode = 400
        options.onError(err, req, res, next)
      })
    })
  }

  function getCount (req, res, next) {
    options.contextFilter(model, req, function (filteredContext) {
      buildQuery(filteredContext.count(), req._ermQueryOptions).exec().then(function (count) {
        req.erm.result = { count: count }
        req.erm.statusCode = 200

        next()
      }, function (err) {
        err.statusCode = 400
        options.onError(err, req, res, next)
      })
    })
  }

  function getShallow (req, res, next) {
    options.contextFilter(model, req, function (filteredContext) {
      buildQuery(findById(filteredContext, req.params.id), req._ermQueryOptions).lean(options.lean).read(options.readPreference).exec().then(function (item) {
        if (!item) {
          var err = new Error(http.STATUS_CODES[404])
          err.statusCode = 404
          return options.onError(err, req, res, next)
        }

        for (var prop in item) {
          item[prop] = typeof item[prop] === 'object' && prop !== '_id' ? true : item[prop]
        }

        req.erm.result = item
        req.erm.statusCode = 200

        next()
      }, function (err) {
        err.statusCode = 400
        options.onError(err, req, res, next)
      })
    })
  }

  function deleteItems (req, res, next) {
    options.contextFilter(model, req, function (filteredContext) {
      buildQuery(filteredContext.find(), req._ermQueryOptions).remove().then(function () {
        req.erm.statusCode = 204

        next()
      }, function (err) {
        err.statusCode = 400
        options.onError(err, req, res, next)
      })
    })
  }

  function getItem (req, res, next) {
    options.contextFilter(model, req, function (filteredContext) {
      buildQuery(findById(filteredContext, req.params.id), req._ermQueryOptions).lean(options.lean).read(options.readPreference).exec().then(function (item) {
        if (!item) {
          var err = new Error(http.STATUS_CODES[404])
          err.statusCode = 404
          return options.onError(err, req, res, next)
        }

        req.erm.result = item
        req.erm.statusCode = 200

        next()
      }, function (err) {
        err.statusCode = 400
        options.onError(err, req, res, next)
      })
    })
  }

  function deleteItem (req, res, next) {
    var byId = {}
    byId[options.idProperty] = req.params.id

    if (options.findOneAndRemove) {
      options.contextFilter(model, req, function (filteredContext) {
        findById(filteredContext, req.params.id).findOneAndRemove().then(function (item) {
          if (!item) {
            var err = new Error(http.STATUS_CODES[404])
            err.statusCode = 404
            return options.onError(err, req, res, next)
          }

          req.erm.statusCode = 204

          next()
        }, function (err) {
          err.statusCode = 400
          options.onError(err, req, res, next)
        })
      })
    } else {
      req.erm.document.remove().then(function () {
        req.erm.statusCode = 204

        next()
      }, function (err) {
        err.statusCode = 400
        options.onError(err, req, res, next)
      })
    }
  }

  function createObject (req, res, next) {
    var filterOpts = {
      access: req.access,
      populate: req._ermQueryOptions.populate
    }

    req.body = options.filter.filterObject(req.body || {}, filterOpts)

    if (model.schema.options._id) {
      delete req.body._id
    }

    if (model.schema.options.versionKey) {
      delete req.body[model.schema.options.versionKey]
    }

    model.create(req.body).then(function (item) {
      return model.populate(item, req._ermQueryOptions.populate || [])
    }).then(function (item) {
      req.erm.result = item
      req.erm.statusCode = 201

      next()
    }, function (err) {
      err.statusCode = 400
      options.onError(err, req, res, next)
    })
  }

  function modifyObject (req, res, next) {
    var filterOpts = {
      access: req.access,
      populate: req._ermQueryOptions.populate
    }

    req.body = options.filter.filterObject(req.body || {}, filterOpts)
    delete req.body._id

    if (model.schema.options.versionKey) {
      delete req.body[model.schema.options.versionKey]
    }

    function depopulate (src) {
      var dst = {}

      for (var key in src) {
        var path = model.schema.path(key)

        if (path && path.caster && path.caster.instance === 'ObjectID') {
          if (_.isArray(src[key])) {
            for (var j = 0; j < src[key].length; ++j) {
              if (typeof src[key][j] === 'object') {
                dst[key] = dst[key] || {}
                dst[key][j] = src[key][j]._id
              }
            }
          } else if (_.isPlainObject(src[key])) {
            dst[key] = src[key]._id
          }
        } else if (_.isPlainObject(src[key])) {
          if (path && path.instance === 'ObjectID') {
            dst[key] = src[key]._id
          } else {
            dst[key] = depopulate(src[key])
          }
        }

        if (typeof dst[key] === 'undefined') {
          dst[key] = src[key]
        }
      }

      return dst
    }

    /* Recursively converts objects to dot notation
     * {
     *   favorites: {
     *     animal: 'Boar',
     *     color: 'Black'
     *   }
     * }
     * ...becomes:
     * {
     *   'favorites.animal': 'Boar',
     *   'favorites.color': 'Black',
     * }
     */
    function flatten (src, dst, prefix) {
      dst = dst || {}
      prefix = prefix || ''

      for (var key in src) {
        if (_.isPlainObject(src[key])) {
          flatten(src[key], dst, prefix + key + '.')
        } else {
          dst[prefix + key] = src[key]
        }
      }

      return dst
    }

    var cleanBody = flatten(depopulate(req.body))

    if (options.findOneAndUpdate) {
      options.contextFilter(model, req, function (filteredContext) {
        findById(filteredContext, req.params.id).findOneAndUpdate({}, {
          $set: cleanBody
        }, {
          new: true,
          runValidators: options.runValidators
        }).exec().then(function (item) {
          return model.populate(item, req._ermQueryOptions.populate || [])
        }).then(function (item) {
          if (!item) {
            var err = new Error(http.STATUS_CODES[404])
            err.statusCode = 404
            return options.onError(err, req, res, next)
          }

          req.erm.result = item
          req.erm.statusCode = 200

          next()
        }, function (err) {
          err.statusCode = 400
          options.onError(err, req, res, next)
        })
      })
    } else {
      for (var key in cleanBody) {
        req.erm.document.set(key, cleanBody[key])
      }

      req.erm.document.save().then(function (item) {
        return model.populate(item, req._ermQueryOptions.populate || [])
      }).then(function (item) {
        req.erm.result = item
        req.erm.statusCode = 200

        next()
      }, function (err) {
        err.statusCode = 400
        options.onError(err, req, res, next)
      })
    }
  }

  return {
    getItems: getItems,
    getCount: getCount,
    getItem: getItem,
    getShallow: getShallow,
    createObject: createObject,
    modifyObject: modifyObject,
    deleteItems: deleteItems,
    deleteItem: deleteItem
  }
}
