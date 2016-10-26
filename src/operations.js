module.exports = function (model, options, excludedMap) {
  const getItems = require('./operations/getItems')(model, options, excludedMap)
  const getCount = require('./operations/getCount')(model, options)
  const getShallow = require('./operations/getShallow')(model, options)
  const deleteItems = require('./operations/deleteItems')(model, options)
  const getItem = require('./operations/getItem')(model, options, excludedMap)
  const deleteItem = require('./operations/deleteItem')(model, options)
  const createObject = require('./operations/createObject')(model, options)
  const modifyObject = require('./operations/modifyObject')(model, options)

  return { getItems, getCount, getItem, getShallow, createObject, modifyObject, deleteItems, deleteItem }
}
