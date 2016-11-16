const findById = require('./../shared').findById
const moredots = require('moredots')
const _ = require('lodash')
const http = require('http')

/**
 * Given a document and the document's model, depopulate any populated fields in the document.
 * Does NOT mutate the populated document.
 */
function depopulate (model, populatedDoc) {
  return _.mapValues(
    populatedDoc,
    (valueAtKey, key) => {
      const path = model.schema.path(key)
      const casterIsObjectID = _.get(path, 'caster.instance') === 'ObjectID'
      const pathIsObjectID = _.get(path, 'instance') === 'ObjectID'

      if (casterIsObjectID && _.isArray(valueAtKey)) {
        // We're dealing with an array of populated objects

        // Convert the objects in the array to ObjectIDs
        return valueAtKey.map(
          element => typeof element === 'object'
            ? element._id
            : element
        )
      } else if (_.isPlainObject(valueAtKey)) {
        // The value is an object, which mean's it's either a nested object (which will have its
        // own paths to depopulate), or it's a populated value.

        if (casterIsObjectID || pathIsObjectID) {
          // The path is a populated value -- grab its id
          return valueAtKey._id
        } else {
          // This path is a nested object -- recursively depopulate
          return depopulate(model, valueAtKey)
        }
      } else {
        // The path is either:
        //  a primitive
        //  a non-plain-object (like a Buffer)
        //  an array of non-populated values
        return valueAtKey
      }
    }
  )
}

function modifyObject (model, options) {
  const errorHandler = require('../../errorHandler')(options)

  return (req, res, next) => {
    req.body = options.filter.filterObject(req.body || {}, {
      access: req.access,
      populate: req._ermQueryOptions.populate
    })

    delete req.body._id

    if (model.schema.options.versionKey) {
      delete req.body[model.schema.options.versionKey]
    }

    const cleanBody = moredots(depopulate(model, req.body))

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
