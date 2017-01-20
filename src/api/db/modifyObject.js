const findById = require('./../shared').findById
const APIMethod = require('../../APIMethod')
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

function doModifyObject (state, req) {
  let accessFilteredBody = state.options.filter.filterObject(req.body || {}, {
    access: state.accessLevel,
    populate: state.query.populate
  })

  delete accessFilteredBody._id

  if (state.model.schema.options.versionKey) {
    delete accessFilteredBody[state.model.schema.options.versionKey]
  }

  // HACK: consumer hooks might depend on us removing the _id and version key
  // Ideally, we don't mutate the request body.
  req.body = accessFilteredBody

  const cleanBody = moredots(depopulate(state.model, accessFilteredBody))

  const updateDocument = state.options.findOneAndUpdate
    ? performFindOneAndUpdate
    : performUpdateAndSave

  return updateDocument(state, req, cleanBody)
    .then(doc => state.model.populate(doc, state.query.populate || []))
    .then(populatedDocument => {
      if (!populatedDocument) {
        return Promise.reject(new Error(http.STATUS_CODES[404]))
      }

      return state
        .set('result', populatedDocument)
        .set('statusCode', 200)
    })
}

/**
 * Find the document specified in the URL (searching in the filtered context),
 * and then apply updates to it using findOneAndUpdate().
 *
 * @param {ERMOperation} state - current ERM state
 * @param {Object} req - Express request
 * @param {Object} updates - object that specifies what updates to make to the document
 *
 * @return {Promise<Object>}
 */
function performFindOneAndUpdate (state, req, updates) {
  return new Promise(resolve => {
    // Search for the URL id in the filtered context.
    state.options.contextFilter(state.model, req, filteredContext => {
      return resolve([
        findById(
          filteredContext,
          req.params.id,
          state.options.idProperty
        )
      ])
    })
  }).then(([documentContext]) => {
    return documentContext.findOneAndUpdate(
      {},
      { $set: updates },
      {
        new: true,
        runValidators: state.options.runValidators
      }
    ).exec()
  })
}

/**
 * Applies updates to the current document in ERM state.
 *
 * Uses set(key, value) -> save() to apply the updates.
 *
 * @param {ERMOperation} state - current ERM state
 * @param {Object} req - Express request
 * @param {Object} updates - object that specifies what updates to make to the document
 *
 * @return {Promise<Object>}
 */
function performUpdateAndSave (state, req, updates) {
  const document = state.document
  for (let key in updates) {
    document.set(key, updates[key])
  }

  return document.save()
}

module.exports = new APIMethod(doModifyObject)
