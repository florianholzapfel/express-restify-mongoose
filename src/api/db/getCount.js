const APIOperation = require('../../Transformation').APIOperation
const applyQueryToContext = require('../applyQueryToContext')

function doGetCount (state) {
  return applyQueryToContext(state.options, state.context.count(), state.query)
    .then(count => {
      return state
        .set('result', { count: count })
        .set('totalCount', count)
        .set('statusCode', 200)
    })
}

module.exports = new APIOperation(doGetCount)
