var _ = require('lodash')
var http = require('http')
var Filter = require('./resource_filter')

module.exports = function (model, options) {
  var buildQuery = require('./buildQuery')(options)
  var filter = new Filter(model, {
    private: options.private,
    protected: options.protected
  })
  var contextFilter

  if (options.contextFilter) {
    contextFilter = options.contextFilter
  } else {
    contextFilter = function (model, req, done) {
      done(model)
    }
  }

  function findById (filteredContext, id) {
    var byId = {}
    byId[options.idProperty] = id
    return filteredContext.findOne().and(byId)
  }

  function getItems (req, res, next) {
    contextFilter(model, req, function (filteredContext) {
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
    contextFilter(model, req, function (filteredContext) {
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
    contextFilter(model, req, function (filteredContext) {
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
    contextFilter(model, req, function (filteredContext) {
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
    contextFilter(model, req, function (filteredContext) {
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
      contextFilter(model, req, function (filteredContext) {
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
      contextFilter(model, req, function (filteredContext) {
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

  function createSingleObject (body) {
    for (var key in body) {
      var path = model.schema.path(key)

      if (typeof path === 'undefined') {
        continue
      }

      if (path.caster !== undefined) {
        if (path.caster.instance === 'ObjectID') {
          if (_.isArray(body[key])) {
            for (var k = 0; k < body[key].length; ++k) {
              if (typeof body[key][k] === 'object') {
                body[key][k] = body[key][k]._id
              }
            }
          } else if ((typeof body[key] === 'object') && (body[key] !== null)) {
            body[key] = body[key]._id
          }
        }
      } else if ((path.instance === 'ObjectID') && (typeof body[key] === 'object') && (body[key] !== null)) {
        body[key] = body[key]._id
      }
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

    if (_.isArray(req.body)) {
      for (var i = 0; i < req.body.length; ++i) {
        createSingleObject(req.body[i])
      }
    } else {
      createSingleObject(req.body)
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

    for (var key in req.body) {
      var path = model.schema.path(key)

      if (typeof path === 'undefined') {
        continue
      }

      if (path.caster !== undefined) {
        if (path.caster.instance === 'ObjectID') {
          if (_.isArray(req.body[key])) {
            for (var j = 0; j < req.body[key].length; ++j) {
              if (typeof req.body[key][j] === 'object') {
                req.body[key][j] = req.body[key][j]._id
              }
            }
          } else if ((typeof req.body[key] === 'object') && (req.body[key] !== null)) {
            req.body[key] = req.body[key]._id
          }
        }
      } else if ((path.instance === 'ObjectID') && (typeof req.body[key] === 'object') && (req.body[key] !== null)) {
        req.body[key] = req.body[key]._id
      }
    }

    if (options.findOneAndUpdate) {
      contextFilter(model, req, function (filteredContext) {
        findById(filteredContext, req.params.id).findOneAndUpdate({}, req.body, {
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
      contextFilter(model, req, function (filteredContext) {
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

          for (var key in req.body) {
            doc.set(key, req.body[key])
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
