'use strict'

const isPlainObject = require('lodash.isplainobject')
const http = require('http')
const moredots = require('moredots')

module.exports = function (model, options, excludedMap) {
  const buildQuery = require('./buildQuery')(options)
  const errorHandler = require('./errorHandler')(options)

  function findById (filteredContext, id) {
    return filteredContext.findOne().and({
      [options.idProperty]: id
    })
  }

  function isDistinctExcluded (req) {
    return options.filter.isExcluded(req._ermQueryOptions['distinct'], {
      access: req.access,
      excludedMap: excludedMap
    })
  }

  function getItems (req, res, next) {
    if (isDistinctExcluded(req)) {
      req.erm.result = []
      req.erm.statusCode = 200
      return next()
    }

    options.contextFilter(model, req, (filteredContext) => {
      buildQuery(filteredContext.find(), req._ermQueryOptions).then((items) => {
        req.erm.result = items
        req.erm.statusCode = 200

        if (options.totalCountHeader && !req._ermQueryOptions['distinct']) {
          options.contextFilter(model, req, (countFilteredContext) => {
            buildQuery(countFilteredContext.count(), Object.assign(req._ermQueryOptions, {
              skip: 0,
              limit: 0
            })).then((count) => {
              req.erm.totalCount = count
              next()
            }, errorHandler(req, res, next))
          })
        } else {
          next()
        }
      }, errorHandler(req, res, next))
    })
  }

  function getCount (req, res, next) {
    options.contextFilter(model, req, (filteredContext) => {
      buildQuery(filteredContext.count(), req._ermQueryOptions).then((count) => {
        req.erm.result = { count: count }
        req.erm.statusCode = 200

        next()
      }, errorHandler(req, res, next))
    })
  }

  function getShallow (req, res, next) {
    options.contextFilter(model, req, (filteredContext) => {
      buildQuery(findById(filteredContext, req.params.id), req._ermQueryOptions).then((item) => {
        if (!item) {
          return errorHandler(req, res, next)(new Error(http.STATUS_CODES[404]))
        }

        for (let prop in item) {
          item[prop] = typeof item[prop] === 'object' && prop !== '_id' ? true : item[prop]
        }

        req.erm.result = item
        req.erm.statusCode = 200

        next()
      }, errorHandler(req, res, next))
    })
  }

  function deleteItems (req, res, next) {
    options.contextFilter(model, req, (filteredContext) => {
      buildQuery(filteredContext.remove(), req._ermQueryOptions).then(() => {
        req.erm.statusCode = 204

        next()
      }, errorHandler(req, res, next))
    })
  }

  function getItem (req, res, next) {
    if (isDistinctExcluded(req)) {
      req.erm.result = []
      req.erm.statusCode = 200
      return next()
    }

    options.contextFilter(model, req, (filteredContext) => {
      buildQuery(findById(filteredContext, req.params.id), req._ermQueryOptions).then((item) => {
        if (!item) {
          return errorHandler(req, res, next)(new Error(http.STATUS_CODES[404]))
        }

        req.erm.result = item
        req.erm.statusCode = 200

        next()
      }, errorHandler(req, res, next))
    })
  }

  function deleteItem (req, res, next) {
    if (options.findOneAndRemove) {
      options.contextFilter(model, req, (filteredContext) => {
        findById(filteredContext, req.params.id).findOneAndRemove().then((item) => {
          if (!item) {
            return errorHandler(req, res, next)(new Error(http.STATUS_CODES[404]))
          }

          req.erm.statusCode = 204

          next()
        }, errorHandler(req, res, next))
      })
    } else {
      req.erm.document.remove().then(() => {
        req.erm.statusCode = 204

        next()
      }, errorHandler(req, res, next))
    }
  }

  function createObject (req, res, next) {
    req.body = options.filter.filterObject(req.body || {}, {
      access: req.access,
      populate: req._ermQueryOptions.populate
    })

    if (model.schema.options._id) {
      delete req.body._id
    }

    if (model.schema.options.versionKey) {
      delete req.body[model.schema.options.versionKey]
    }

    model.create(req.body).then((item) => model.populate(item, req._ermQueryOptions.populate || [])).then((item) => {
      req.erm.result = item
      req.erm.statusCode = 201

      next()
    }, errorHandler(req, res, next))
  }

  function modifyObject (req, res, next) {
    req.body = options.filter.filterObject(req.body || {}, {
      access: req.access,
      populate: req._ermQueryOptions.populate
    })

    delete req.body._id

    if (model.schema.options.versionKey) {
      delete req.body[model.schema.options.versionKey]
    }

    function depopulate (src) {
      let dst = {}

      for (let key in src) {
        const path = model.schema.path(key)

        if (path && path.caster && path.caster.instance === 'ObjectID') {
          if (Array.isArray(src[key])) {
            for (let j = 0; j < src[key].length; ++j) {
              if (typeof src[key][j] === 'object') {
                dst[key] = dst[key] || []
                dst[key].push(src[key][j]._id)
              }
            }
          } else if (isPlainObject(src[key])) {
            dst[key] = src[key]._id
          }
        } else if (isPlainObject(src[key])) {
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

    const cleanBody = moredots(depopulate(req.body))

    if (options.findOneAndUpdate) {
      options.contextFilter(model, req, (filteredContext) => {
        findById(filteredContext, req.params.id).findOneAndUpdate({}, {
          $set: cleanBody
        }, {
          new: true,
          runValidators: options.runValidators
        }).exec().then((item) => model.populate(item, req._ermQueryOptions.populate || [])).then((item) => {
          if (!item) {
            return errorHandler(req, res, next)(new Error(http.STATUS_CODES[404]))
          }

          req.erm.result = item
          req.erm.statusCode = 200

          next()
        }, errorHandler(req, res, next))
      })
    } else {
      for (let key in cleanBody) {
        req.erm.document.set(key, cleanBody[key])
      }

      req.erm.document.save().then((item) => model.populate(item, req._ermQueryOptions.populate || [])).then((item) => {
        req.erm.result = item
        req.erm.statusCode = 200

        next()
      }, errorHandler(req, res, next))
    }
  }

  return { getItems, getCount, getItem, getShallow, createObject, modifyObject, deleteItems, deleteItem }
}
