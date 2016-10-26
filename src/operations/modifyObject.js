const findById = require('./shared').findById
const moredots = require('moredots')
const _ = require('lodash')
const http = require('http')

function modifyObject (model, options) {
  const errorHandler = require('../errorHandler')(options)

  return (req, res, next) => {
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
          if (_.isArray(src[key])) {
            for (let j = 0; j < src[key].length; ++j) {
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

        if (_.isUndefined(dst[key])) {
          dst[key] = src[key]
        }
      }

      return dst
    }

    const cleanBody = moredots(depopulate(req.body))

    if (options.findOneAndUpdate) {
      options.contextFilter(model, req, (filteredContext) => {
        findById(filteredContext, req.params.id, options.idProperty).findOneAndUpdate({}, {
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
}

module.exports = modifyObject
