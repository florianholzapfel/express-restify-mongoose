module.exports = function (ermInstance) {
  const getItems = require('./api/database-operations/getItems').getMiddleware(ermInstance)
  const getCount = require('./api/database-operations/getCount').getMiddleware(ermInstance)
  const getShallow = require('./api/database-operations/getShallow').getMiddleware(ermInstance)
  const deleteItems = require('./api/database-operations/deleteItems').getMiddleware(ermInstance)
  const getItem = require('./api/database-operations/getItem').getMiddleware(ermInstance)
  const deleteItem = require('./api/database-operations/deleteItem').getMiddleware(ermInstance)
  const createObject = require('./api/database-operations/createObject').getMiddleware(ermInstance)
  const modifyObject = require('./api/database-operations/modifyObject').getMiddleware(ermInstance)

  return { getItems, getCount, getItem, getShallow, createObject, modifyObject, deleteItems, deleteItem }
}

