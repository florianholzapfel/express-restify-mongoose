module.exports = function (ermInstance) {
  const getItems = require('./api/db/getItems').getMiddleware(ermInstance)
  const getCount = require('./api/db/getCount').getMiddleware(ermInstance)
  const getShallow = require('./api/db/getShallow').getMiddleware(ermInstance)
  const deleteItems = require('./api/db/deleteItems').getMiddleware(ermInstance)
  const getItem = require('./api/db/getItem').getMiddleware(ermInstance)
  const deleteItem = require('./api/db/deleteItem').getMiddleware(ermInstance)
  const createObject = require('./api/db/createObject').getMiddleware(ermInstance)
  const modifyObject = require('./api/db/modifyObject').getMiddleware(ermInstance)

  return { getItems, getCount, getItem, getShallow, createObject, modifyObject, deleteItems, deleteItem }
}

