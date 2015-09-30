var _ = require('lodash')
var http = require('http')
var Filter = require('./resource_filter')

module.exports = function (model, options) {
  var buildQuery = require('./buildQuery')(options)
  var filter = new Filter(model, {
    private: options.private,
    protected: options.protected
  })

  function findById (filteredContext, id) {
    var byId = {}
    byId[options.idProperty] = id
    return filteredContext.findOne().and(byId)
  }

  function getItems (req, res, next) {
    options.contextFilter(model, req, function (filteredContext) {
      buildQuery(filteredContext.find(), req._ermQueryOptions).lean(options.lean).exec(function (err, items) {
        if (err) {
          err.statusCode = 400
          return options.onError(err, req, res, next)
        }

        var populate = req._ermQueryOptions.populate
        var opts = {
          populate: populate,
          access: req.access
        }

        items = filter.filterObject(items, opts)

        req._ermResult = items
        req._ermStatusCode = 200

        next()
      })
    })
  }

  function getCount (req, res, next) {
    options.contextFilter(model, req, function (filteredContext) {
      buildQuery(filteredContext.count(), req._ermQueryOptions).exec(function (err, count) {
        if (err) {
          err.statusCode = 400
          return options.onError(err, req, res, next)
        }

        req._ermResult = { count: count }
        req._ermStatusCode = 200

        next()
      })
    })
  }

  function getShallow (req, res, next) {
    options.contextFilter(model, req, function (filteredContext) {
      buildQuery(findById(filteredContext, req.params.id), req._ermQueryOptions).lean(options.lean).exec(function (err, item) {
        if (err) {
          err.statusCode = 400
          return options.onError(err, req, res, next)
        }

        if (!item) {
          err = new Error(http.STATUS_CODES[404])
          err.statusCode = 404
          return options.onError(err, req, res, next)
        }

        var populate = req._ermQueryOptions.populate
        var opts = {
          populate: populate,
          access: req.access
        }

        item = filter.filterObject(item, opts)

        for (var prop in item) {
          item[prop] = typeof item[prop] === 'object' && prop !== '_id' ? true : item[prop]
        }

        req._ermResult = item
        req._ermStatusCode = 200

        next()
      })
    })
  }

  function deleteItems (req, res, next) {
    options.contextFilter(model, req, function (filteredContext) {
      buildQuery(filteredContext.find(), req._ermQueryOptions).remove(function (err, items) {
        if (err) {
          err.statusCode = 400
          return options.onError(err, req, res, next)
        }

        req._ermStatusCode = 204

        next()
      })
    })
  }

  function getItem (req, res, next) {
    options.contextFilter(model, req, function (filteredContext) {
      buildQuery(findById(filteredContext, req.params.id), req._ermQueryOptions).lean(options.lean).exec(function (err, item) {
        if (err) {
          err.statusCode = 400
          return options.onError(err, req, res, next)
        }

        if (!item) {
          err = new Error(http.STATUS_CODES[404])
          err.statusCode = 404
          return options.onError(err, req, res, next)
        }

        var populate = req._ermQueryOptions.populate
        var opts = {
          populate: populate,
          access: req.access
        }

        item = filter.filterObject(item, opts)

        req._ermResult = item
        req._ermStatusCode = 200

        next()
      })
    })
  }

  function deleteItem (req, res, next) {
    var byId = {}
    byId[options.idProperty] = req.params.id

    if (options.findOneAndRemove) {
      options.contextFilter(model, req, function (filteredContext) {
        findById(filteredContext, req.params.id).findOneAndRemove(function (err, doc) {
          if (err) {
            err.statusCode = 400
            return options.onError(err, req, res, next)
          }

          if (!doc) {
            err = new Error(http.STATUS_CODES[404])
            err.statusCode = 404
            return options.onError(err, req, res, next)
          }

          req._ermStatusCode = 204

          next()
        })
      })
    } else {
      options.contextFilter(model, req, function (filteredContext) {
        findById(filteredContext, req.params.id).exec(function (err, doc) {
          if (err) {
            err.statusCode = 400
            return options.onError(err, req, res, next)
          }

          if (!doc) {
            err = new Error(http.STATUS_CODES[404])
            err.statusCode = 404
            return options.onError(err, req, res, next)
          }

          doc.remove(function (err, result) {
            if (err) {
              err.statusCode = 400
              return options.onError(err, req, res, next)
            }

            req._ermStatusCode = 204

            next()
          })
        })
      })
    }
  }

  function createObject (req, res, next) {
    var filterOpts = {
      access: req.access
    }

    req.body = filter.filterObject(req.body || {}, filterOpts)

    if (model.schema.options._id) {
      delete req.body._id
    }

    if (model.schema.options.versionKey) {
      delete req.body[model.schema.options.versionKey]
    }

    model.create(req.body, function (err, item) {
      if (err) {
        err.statusCode = 400
        return options.onError(err, req, res, next)
      }

      item = filter.filterObject(item, filterOpts)

      req._ermResult = item
      req._ermStatusCode = 201

      next()
    })
  }

  function modifyObject (req, res, next) {
    var filterOpts = {
      access: req.access
    }

    req.body = filter.filterObject(req.body || {}, filterOpts)
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
        } else {
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
        }, function (err, item) {
          if (err) {
            err.statusCode = 400
            return options.onError(err, req, res, next)
          }

          if (!item) {
            err = new Error(http.STATUS_CODES[404])
            err.statusCode = 404
            return options.onError(err, req, res, next)
          }

          item = filter.filterObject(item, filterOpts)

          req._ermResult = item
          req._ermStatusCode = 200

          next()
        })
      })
    } else {
      options.contextFilter(model, req, function (filteredContext) {
        findById(filteredContext, req.params.id).exec(function (err, doc) {
          if (err) {
            err.statusCode = 400
            return options.onError(err, req, res, next)
          }

          if (!doc) {
            err = new Error(http.STATUS_CODES[404])
            err.statusCode = 404
            return options.onError(err, req, res, next)
          }

          for (var key in cleanBody) {
            doc.set(key, cleanBody[key])
          }

          doc.save(function (err, item) {
            if (err) {
              err.statusCode = 400
              return options.onError(err, req, res, next)
            }

            item = filter.filterObject(item, filterOpts)

            req._ermResult = item
            req._ermStatusCode = 200

            next()
          })
        })
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
