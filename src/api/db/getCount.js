const APIMethod = require('../../APIMethod')
const applyQueryToContext = require('../applyQueryToContext')

function doGetCount (state, req) {
  // Explicit construction because contextFilter() takes a callback
  return new Promise((resolve, reject) => {
    state.options.contextFilter(
      state.model,
      req,
      filteredContext => {
        applyQueryToContext(state.options, filteredContext.count(), state.query)
          .then(count => {
            return resolve(
              state
                .set('result', { count: count })
                .set('totalCount', count)
                .set('statusCode', 200)
            )
          })
          .catch(err => reject(err))
      }
    )
  })
}

module.exports = new APIMethod(doGetCount)
