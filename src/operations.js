module.exports = function (ermInstance) {
  const getItems = require('./api/getItems')(ermInstance.model, ermInstance.options, ermInstance.excludedMap)
  const getCount = require('./api/getCount')(ermInstance.model, ermInstance.options)
  const getShallow = require('./api/getShallow')(ermInstance.model, ermInstance.options)
  const deleteItems = require('./api/deleteItems')(ermInstance.model, ermInstance.options)
  const getItem = require('./api/getItem')(ermInstance.model, ermInstance.options, ermInstance.excludedMap)
  const deleteItem = require('./api/deleteItem').getMiddleware(ermInstance)
  const createObject = require('./api/createObject').getMiddleware(ermInstance)
  const modifyObject = require('./api/modifyObject')(ermInstance.model, ermInstance.options)

  return { getItems, getCount, getItem, getShallow, createObject, modifyObject, deleteItems, deleteItem }
}

