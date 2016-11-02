module.exports = function (ermInstance) {
  const getItems = require('./api/database-operations/getItems')(ermInstance.model, ermInstance.options, ermInstance.excludedMap)
  const getCount = require('./api/database-operations/getCount').getMiddleware(ermInstance)
  const getShallow = require('./api/database-operations/getShallow')(ermInstance.model, ermInstance.options)
  const deleteItems = require('./api/database-operations/deleteItems').getMiddleware(ermInstance)
  const getItem = require('./api/database-operations/getItem')(ermInstance.model, ermInstance.options, ermInstance.excludedMap)
  const deleteItem = require('./api/database-operations/deleteItem').getMiddleware(ermInstance)
  const createObject = require('./api/database-operations/createObject').getMiddleware(ermInstance)
  const modifyObject = require('./api/database-operations/modifyObject')(ermInstance.model, ermInstance.options)

  return { getItems, getCount, getItem, getShallow, createObject, modifyObject, deleteItems, deleteItem }
}

