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

/**
 * Update an existing document. Has support for two different update methods:
 *
 *  1. findOneAndUpdate(), which operates on a ModelQuery
 *      * context needs to be a ModelQuery
 *      * Uses runValidators option
 *      * The update itself is atomic
 *
 *  2. update() -> save(), which operates on a document
 *      * context needs to be a Document
 *      * The operation is not atomic
 *
 * @param {Boolean} useFindOneAndUpdate - if true, uses findOneAndUpdate(), otherwise uses save()
 * @param {Boolean} runValidators - whether or not to run Schema validators
 * @param {Object} model - the mongoose model corresponding to the document/context
 * @param {ModelQuery|Object} context - the context of the operation, either a ModelQuery or document
 * @param {Object} updates - object that specifies which updates to make to the document
 * @param {Object} query - query associated with the operation (needed for populate)
 *
 * @return {Promise<Object>}
 */
function modifyObject (useFindOneAndUpdate, runValidators, model, context, updates, query) {
  const updateDocument = useFindOneAndUpdate
    ? performFindOneAndUpdate(context, updates, runValidators)
    : performUpdateAndSave(context, updates)

  return updateDocument
    .then(doc => model.populate(doc, query.populate || []))
    .then(populatedDocument => {
      if (!populatedDocument) {
        return Promise.reject(new Error(http.STATUS_CODES[404]))
      }

      return populatedDocument
    })
}

/**
 * Given a mongoose context, document updates to make, and schema validators option, performs a
 * findOneAndUpdate() operation that applies the updates.
 *
 * @param {ModelQuery} mongooseContext - ModelQuery representing the document to update
 * @param {Object} updates - object that specifies what updates to make to the document
 * @param {Boolean} runValidators - whether to run Schema validators
 *
 * @return {Promise<Object>}
 */
function performFindOneAndUpdate (mongooseContext, updates, runValidators) {
  return mongooseContext.findOneAndUpdate(
    {},
    { $set: updates },
    {
      new: true,
      runValidators: runValidators
    }
  ).exec()
}

/**
 * Given a mongoose document and document updates to make, updates the document (by set():ing
 * the values of the document and then save():ing.
 *
 * @param {Object} document - Document representing the document to update
 * @param {Object} updates - object that specifies what updates to make to the document
 *
 * @return {Promise<Object>}
 */
function performUpdateAndSave (document, updates) {
  for (let key in updates) {
    document.set(key, updates[key])
  }

  return document.save()
}

/**
 * Make partial or complete updates to a document already present in the database, based on the
 * request body. Uses the query and context filter specified in the ERM operation state.
 *
 * This operation may or may not be atomic, depending on the configuration (findOneAndUpdate)
 *    * See modifyObject() for more information
 *
 * @param {ERMOperation} state
 * @param {Object} req
 * @return {Promise<ERMOperation>}
 */
function modifyObjectWithRequest (state, req) {
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

  return getModifyObjectContextFromState(state, req)
    .then(([ context ]) => {
      return modifyObject(
        state.options.findOneAndUpdate,
        state.options.runValidators,
        state.model,
        context,
        cleanBody,
        state.query
      )
    })
    .then(populatedDocument => {
      return state
        .set('result', populatedDocument)
        .set('statusCode', 200)
    })
}

/**
 * Given ERM state and an express request, determine what the context of the modifyObject
 * operation should be.
 *
 * It will either be:
 *  1) a mongoose ModelQuery if findOneAndUpdate is true
 *  2) a mongoose Document if findOneAndUpdate is false
 *
 * The value is returned as a 1-tuple, because bluebird thinks a ModelQuery is a Promise (it has
 * a then() function) and "resolves" the ModelQuery to a document before it reaches the caller.
 *
 * @param {ERMOperation} state
 * @param {Object} req
 * @return {Promise<[ModelQuery|Object]>}
 */
function getModifyObjectContextFromState (state, req) {
  if (state.options.findOneAndUpdate) {
    return new Promise(resolve => {
      return state.options.contextFilter(state.model, req, filteredContext => {
        return resolve([
          findById(filteredContext, req.params.id, state.options.idProperty)
        ])
      })
    })
  } else {
    return Promise.resolve([ state.document ])
  }
}

module.exports = new APIMethod(
  modifyObject,
  modifyObjectWithRequest
)
