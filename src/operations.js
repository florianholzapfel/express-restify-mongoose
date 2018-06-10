'use strict'

const isPlainObject = require('lodash.isplainobject')
const http = require('http')
const moredots = require('moredots')

module.exports = function(model, options, excludedMap) {
  const buildQuery = require('./buildQuery')(options)
  const errorHandler = require('./errorHandler')(options)

  function findById(filteredContext, id) {
    return filteredContext.findOne().and({
      [options.idProperty]: id
    })
  }

  function isDistinctExcluded(req) {
    return options.filter.isExcluded(req.erm.query['distinct'], {
      access: req.access,
      excludedMap: excludedMap
    })
  }

  function getItems(req, res, next) {
    const contextModel = (req.erm && req.erm.model) || model

    if (isDistinctExcluded(req)) {
      req.erm.result = []
      req.erm.statusCode = 200
      return next()
    }

    options.contextFilter(contextModel, req, filteredContext => {
      buildQuery(filteredContext.find(), req.erm.query).then(items => {
        req.erm.result = items
        req.erm.statusCode = 200

        if (options.totalCountHeader && !req.erm.query['distinct']) {
          options.contextFilter(contextModel, req, countFilteredContext => {
            buildQuery(
              countFilteredContext.count(),
              Object.assign(req.erm.query, {
                skip: 0,
                limit: 0
              })
            ).then(count => {
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

  function getCount(req, res, next) {
    const contextModel = (req.erm && req.erm.model) || model

    options.contextFilter(contextModel, req, filteredContext => {
      buildQuery(filteredContext.count(), req.erm.query).then(count => {
        req.erm.result = { count: count }
        req.erm.statusCode = 200

        next()
      }, errorHandler(req, res, next))
    })
  }

  function getShallow(req, res, next) {
    const contextModel = (req.erm && req.erm.model) || model

    options.contextFilter(contextModel, req, filteredContext => {
      buildQuery(findById(filteredContext, req.params.id), req.erm.query).then(item => {
        if (!item) {
          return errorHandler(req, res, next)(new Error(http.STATUS_CODES[404]))
        }

        for (const prop in item) {
          item[prop] = typeof item[prop] === 'object' && prop !== '_id' ? true : item[prop]
        }

        req.erm.result = item
        req.erm.statusCode = 200

        next()
      }, errorHandler(req, res, next))
    })
  }

  function deleteItems(req, res, next) {
    const contextModel = (req.erm && req.erm.model) || model

    options.contextFilter(contextModel, req, filteredContext => {
      buildQuery(filteredContext.remove(), req.erm.query).then(() => {
        req.erm.statusCode = 204

        next()
      }, errorHandler(req, res, next))
    })
  }

  function getItem(req, res, next) {
    const contextModel = (req.erm && req.erm.model) || model

    if (isDistinctExcluded(req)) {
      req.erm.result = []
      req.erm.statusCode = 200
      return next()
    }

    options.contextFilter(contextModel, req, filteredContext => {
      buildQuery(findById(filteredContext, req.params.id), req.erm.query).then(item => {
        if (!item) {
          return errorHandler(req, res, next)(new Error(http.STATUS_CODES[404]))
        }

        req.erm.result = item
        req.erm.statusCode = 200

        next()
      }, errorHandler(req, res, next))
    })
  }

  function deleteItem(req, res, next) {
    const contextModel = (req.erm && req.erm.model) || model

    if (options.findOneAndRemove) {
      options.contextFilter(contextModel, req, filteredContext => {
        findById(filteredContext, req.params.id)
          .findOneAndRemove()
          .then(item => {
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

  function createObject(req, res, next) {
    const contextModel = (req.erm && req.erm.model) || model

    req.body = options.filter.filterObject(req.body || {}, {
      access: req.access,
      populate: req.erm.query.populate
    })

    if (req.body._id === null) {
      delete req.body._id
    }

    if (contextModel.schema.options.versionKey) {
      delete req.body[contextModel.schema.options.versionKey]
    }

    contextModel
      .create(req.body)
      .then(item => contextModel.populate(item, req.erm.query.populate || []))
      .then(item => {
        req.erm.result = item
        req.erm.statusCode = 201

        next()
      }, errorHandler(req, res, next))
  }

  function modifyObject(req, res, next) {
    const contextModel = (req.erm && req.erm.model) || model

    req.body = options.filter.filterObject(req.body || {}, {
      access: req.access,
      populate: req.erm.query.populate
    })

    delete req.body._id

    if (contextModel.schema.options.versionKey) {
      delete req.body[contextModel.schema.options.versionKey]
    }

    function depopulate(src) {
      const dst = {}

      for (const key in src) {
        const path = contextModel.schema.path(key)

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
      options.contextFilter(contextModel, req, filteredContext => {
        findById(filteredContext, req.params.id)
          .findOneAndUpdate(
            {},
            {
              $set: cleanBody
            },
            {
              new: true,
              runValidators: options.runValidators
            }
          )
          .exec()
          .then(item => contextModel.populate(item, req.erm.query.populate || []))
          .then(item => {
            if (!item) {
              return errorHandler(req, res, next)(new Error(http.STATUS_CODES[404]))
            }

            req.erm.result = item
            req.erm.statusCode = 200

            next()
          }, errorHandler(req, res, next))
      })
    } else {
      for (const key in cleanBody) {
        req.erm.document.set(key, cleanBody[key])
      }

      req.erm.document
        .save()
        .then(item => contextModel.populate(item, req.erm.query.populate || []))
        .then(item => {
          req.erm.result = item
          req.erm.statusCode = 200

          next()
        }, errorHandler(req, res, next))
    }
  }

  return { getItems, getCount, getItem, getShallow, createObject, modifyObject, deleteItems, deleteItem }
}
