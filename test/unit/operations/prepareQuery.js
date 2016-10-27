const assert = require('assert')
const _ = require('lodash')

describe('prepareQuery', () => {
  const prepareQuery = require('../../../lib/operations/prepareQuery')

  /**
   * This test of the prepareQuery() middleware passes if prepareQuery() successfully prepares
   * the query and resolves.
   *
   * Returns a Promise that resolves if the test passes.
   *
   * @param {Object} allowRegex true - whether or not regex is allowed in the query string object
   * @param {Object} queryStringObject - query string object
   * @param {Object} [expectedQueryOptions] - expected result of the prepareQuery() (i.e. the thing stored in _ermQueryOptions)
   * @return {Promise}
   */
  function assertPrepareQueryHasResult (allowRegex = true, queryStringObject, expectedQueryOptions) {
    assert.ok(!_.isUndefined(queryStringObject))

    return new Promise((resolve, reject) => {
      return prepareQuery(allowRegex)(queryStringObject)
        .then(actualQueryOptions => {
          try {
            if (expectedQueryOptions) {
              assert.deepEqual(actualQueryOptions, expectedQueryOptions)
            }

            return resolve()
          } catch (err) {
            // Since we're inside-a-function-inside-a-promise, we need to manually check
            // whether our assertions failed and tell the promise what happened.
            return reject(err)
          }
        })
        .catch(err => reject(err))
    })
  }

  /**
   * This test of the prepareQuery() middleware passes if prepareQuery() throws.
   *
   * Returns a Promise that resolves if the test passes.
   *
   * @param {Object} allowRegex true - whether or not regex is allowed in the query string object
   * @param {Object} queryStringObject - query string object
   * @param {Object} [expectedError] - expected result of the prepareQuery() (i.e. the thing stored in _ermQueryOptions)
   * @return {Promise}
   */
  function assertPrepareQueryThrowsError (allowRegex = true, queryStringObject, expectedError) {
    assert.ok(!_.isUndefined(queryStringObject))

    return new Promise((resolve, reject) => {
      return prepareQuery(allowRegex)(queryStringObject)
        .then(() => reject(new Error('prepareQuery() should have thrown')))
        .catch(actualError => {
          try {
            // The actual error should match the expected one
            if (expectedError) {
              // use lodash .isEqual() because assert.deepEqual() doesn't check the error message
              assert.ok(_.isEqual(actualError, expectedError))
            }

            return resolve()
          } catch (err) {
            // Since we're inside-a-function-inside-a-promise, we need to manually check
            // whether our assertions failed and tell the promise what happened.
            return reject(err)
          }
        })
    })
  }

  describe('jsonQueryParser', () => {
    it('converts ~ to a case insensitive regex', () => {
      let query = {
        query: '{"foo":"~bar"}'
      }

      return assertPrepareQueryHasResult(true, query, {
        query: {
          foo: new RegExp('bar', 'i')
        }
      })
    })

    it('converts ~ to undefined', () => {
      let query = {
        query: '{"foo":"~bar"}'
      }

      return assertPrepareQueryHasResult(false, query, {
        query: {}
      })
    })

    it('converts $regex to undefined', () => {
      let query = {
        query: '{"foo":{"$regex":"bar"}}'
      }

      return assertPrepareQueryHasResult(false, query, {
        query: {
          foo: {}
        }
      })
    })

    it('converts >= to $gte', () => {
      let query = {
        query: '{"foo":">=bar"}'
      }

      return assertPrepareQueryHasResult(true, query, {
        query: {
          foo: { $gte: 'bar' }
        }
      })
    })

    it('converts > to $gt', () => {
      let query = {
        query: '{"foo":">bar"}'
      }

      return assertPrepareQueryHasResult(true, query, {
        query: {
          foo: { $gt: 'bar' }
        }
      })
    })

    it('converts <= to $lte', () => {
      let query = {
        query: '{"foo":"<=bar"}'
      }

      return assertPrepareQueryHasResult(true, query, {
        query: {
          foo: { $lte: 'bar' }
        }
      })
    })

    it('converts < to $lt', () => {
      let query = {
        query: '{"foo":"<bar"}'
      }

      return assertPrepareQueryHasResult(true, query, {
        query: {
          foo: { $lt: 'bar' }
        }
      })
    })

    it('converts != to $ne', () => {
      let query = {
        query: '{"foo":"!=bar"}'
      }

      return assertPrepareQueryHasResult(true, query, {
        query: {
          foo: { $ne: 'bar' }
        }
      })
    })

    // This feature was disabled because it queryuires MongoDB 3
    it.skip('converts = to $eq', () => {
      let query = {
        query: '{"foo":"=bar"}'
      }

      return assertPrepareQueryHasResult(true, query, {
        query: {
          foo: { $eq: 'bar' }
        }
      })
    })

    it('converts [] to $in', () => {
      let query = {
        query: '{"foo":["bar"]}'
      }

      return assertPrepareQueryHasResult(true, query, {
        query: {
          foo: { $in: ['bar'] }
        }
      })
    })
  })

  it('resolves when query is empty', () => {
    return assertPrepareQueryHasResult(true, {})
  })

  it('ignores keys that are not whitelisted and resolves', () => {
    let query = {
      foo: 'bar'
    }

    return assertPrepareQueryHasResult(true, query, {})
  })

  it('resolves when query key is valid json', () => {
    let query = {
      query: '{"foo":"bar"}'
    }

    return assertPrepareQueryHasResult(true, query,
      {
        query: JSON.parse(query.query)
      }
    )
  })

  it('throws when query key is invalid json', () => {
    let query = {
      query: 'not json'
    }

    return assertPrepareQueryThrowsError(true, query, new Error('invalid_json_query'))
  })

  it('resolves when sort key is valid json', () => {
    let query = {
      sort: '{"foo":"bar"}'
    }

    return assertPrepareQueryHasResult(true, query,
      {
        sort: JSON.parse(query.sort)
      }
    )
  })

  it('resolves when sort key is a string', () => {
    let query = {
      sort: 'foo'
    }

    return assertPrepareQueryHasResult(true, query, query)
  })

  it('resolves when skip key is a string', () => {
    let query = {
      skip: '1'
    }

    return assertPrepareQueryHasResult(true, query, query)
  })

  it('resolves when limit key is a string', () => {
    let query = {
      limit: '1'
    }

    return assertPrepareQueryHasResult(true, query, query)
  })

  it('resolves when distinct key is a string', () => {
    let query = {
      distinct: 'foo'
    }

    return assertPrepareQueryHasResult(true, query, query)
  })

  it('resolves when populate key is a string', () => {
    let query = {
      populate: 'foo'
    }

    return assertPrepareQueryHasResult(true, query,
      {
        populate: [{
          path: 'foo'
        }]
      }
    )
  })

  describe('select', () => {
    it('parses a string to include fields', () => {
      let query = {
        select: 'foo'
      }

      return assertPrepareQueryHasResult(true, query,
        {
          select: {
            foo: 1
          }
        }
      )
    })

    it('parses a string to exclude fields', () => {
      let query = {
        select: '-foo'
      }

      return assertPrepareQueryHasResult(true, query,
        {
          select: {
            foo: 0
          }
        }
      )
    })

    it('parses a comma separated list of fields to include', () => {
      let query = {
        select: 'foo,bar'
      }

      return assertPrepareQueryHasResult(true, query,
        {
          select: {
            foo: 1,
            bar: 1
          }
        }
      )
    })

    it('parses a comma separated list of fields to exclude', () => {
      let query = {
        select: '-foo,-bar'
      }

      return assertPrepareQueryHasResult(true, query, {
        select: {
          foo: 0,
          bar: 0
        }
      })
    })

    it('parses a comma separated list of nested fields', () => {
      let query = {
        select: 'foo.bar,baz.qux.quux'
      }

      return assertPrepareQueryHasResult(true, query, {
        select: {
          'foo.bar': 1,
          'baz.qux.quux': 1
        }
      })
    })
  })

  describe('populate', () => {
    it('parses a string to populate a path', () => {
      let query = {
        populate: 'foo'
      }

      return assertPrepareQueryHasResult(true, query, {
        populate: [{
          path: 'foo'
        }]
      })
    })

    it('parses a string to populate multiple paths', () => {
      let query = {
        populate: 'foo,bar'
      }

      return assertPrepareQueryHasResult(true, query, {
        populate: [{
          path: 'foo'
        }, {
          path: 'bar'
        }]
      })
    })

    it('accepts an object to populate a path', () => {
      let query = {
        populate: {
          path: 'foo.bar',
          select: 'baz',
          match: { 'qux': 'quux' },
          true: { sort: 'baz' }
        }
      }

      return assertPrepareQueryHasResult(true, query, {
        populate: [{
          path: 'foo.bar',
          select: 'baz',
          match: { 'qux': 'quux' },
          true: { sort: 'baz' }
        }]
      })
    })

    it('parses a string to populate and select fields', () => {
      let query = {
        populate: 'foo',
        select: 'foo.bar,foo.baz'
      }

      return assertPrepareQueryHasResult(true, query, {
        populate: [{
          path: 'foo',
          select: 'bar baz'
        }]
      })
    })
  })
})
