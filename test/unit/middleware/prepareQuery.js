const assert = require('assert')
const sinon = require('sinon')
const _ = require('lodash')

describe('prepareQuery', () => {
  const prepareQuery = require('../../../lib/middleware/prepareQuery')

  let options = {
    onError: sinon.spy(),
    allowRegex: true
  }

  let next = sinon.spy()

  /**
   * This test of the prepareQuery() middleware passes if prepareQuery() successfully prepares
   * the query and calls next().
   *
   * If expected query options are passed to the test, the test will also assert that the
   * _ermQueryOptions property of the request matches the expected output.
   *
   * This function returns a Promise that resolves if the test passes.
   *
   * @param {Object} prepareQueryOptions - erm options passed to prepareQuery()
   * @param {Object} req - request object that's passed to Express
   * @param {Object} res - response object that's passed to Express
   * @param {Object} [expectedQueryOptions] - expected result of the prepareQuery() (i.e. the thing stored in _ermQueryOptions)
   * @return {Promise}
   */
  function assertPrepareQueryHasResult (prepareQueryOptions, req, res, expectedQueryOptions) {
    assert.ok(!_.isUndefined(prepareQueryOptions))
    assert.ok(!_.isUndefined(req))
    assert.ok(!_.isUndefined(res))

    return new Promise((resolve, reject) => {
      return prepareQuery(prepareQueryOptions)(req, res, () => {
        try {
          sinon.assert.notCalled(prepareQueryOptions.onError)

          if (expectedQueryOptions) {
            assert.deepEqual(req._ermQueryOptions, expectedQueryOptions)
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

  /**
   * This test of the prepareQuery() middleware passes if prepareQuery() successfully prepares
   * the query and calls next().
   *
   * If expected query options are passed to the test, the test will also assert that the
   * _ermQueryOptions property of the request matches the expected output.
   *
   * This function returns a Promise that resolves if the test passes.
   *
   * @param {Object} prepareQueryOptions - erm options passed to prepareQuery()
   * @param {Object} req - request object that's passed to Express
   * @param {Object} res - response object that's passed to Express
   * @param {Object} [expectedError] - expected result of the prepareQuery() (i.e. the thing stored in _ermQueryOptions)
   * @return {Promise}
   */
  function assertPrepareQueryThrowsError (prepareQueryOptions, req, res, expectedError) {
    assert.ok(!_.isUndefined(prepareQueryOptions))
    assert.ok(!_.isUndefined(req))
    assert.ok(!_.isUndefined(res))

    return new Promise((resolve, reject) => {
      // Wrap the provided options, but use a special error handler
      const wrappedOptions = _.assign(
        {},
        prepareQueryOptions,
        {
          onError: (actualError, actualRequest, actualResponse, actualNext) => {
            try {
              // If prepare query errored, then next shouldn't have been called.
              sinon.assert.notCalled(next)

              // req, res, and next shouldn't have been modified.
              assert.deepEqual(actualRequest, req)
              assert.deepEqual(actualResponse, res)
              assert.deepEqual(actualNext, next)

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
          }
        }
      )

      return prepareQuery(wrappedOptions)(req, res, next)
    })
  }

  afterEach(() => {
    options.onError.reset()
    options.allowRegex = true
    next.reset()
  })

  describe('jsonQueryParser', () => {
    it('converts ~ to a case insensitive regex', () => {
      let req = {
        query: {
          query: '{"foo":"~bar"}'
        }
      }

      return assertPrepareQueryHasResult(options, req, {}, {
        query: {
          foo: new RegExp('bar', 'i')
        }
      })
    })

    it('converts ~ to undefined', () => {
      let req = {
        query: {
          query: '{"foo":"~bar"}'
        }
      }

      options.allowRegex = false

      return assertPrepareQueryHasResult(options, req, {}, {
        query: {}
      })
    })

    it('converts $regex to undefined', () => {
      let req = {
        query: {
          query: '{"foo":{"$regex":"bar"}}'
        }
      }

      options.allowRegex = false

      return assertPrepareQueryHasResult(options, req, {}, {
        query: {
          foo: {}
        }
      })
    })

    it('converts >= to $gte', () => {
      let req = {
        query: {
          query: '{"foo":">=bar"}'
        }
      }

      return assertPrepareQueryHasResult(options, req, {}, {
        query: {
          foo: { $gte: 'bar' }
        }
      })
    })

    it('converts > to $gt', () => {
      let req = {
        query: {
          query: '{"foo":">bar"}'
        }
      }

      return assertPrepareQueryHasResult(options, req, {}, {
        query: {
          foo: { $gt: 'bar' }
        }
      })
    })

    it('converts <= to $lte', () => {
      let req = {
        query: {
          query: '{"foo":"<=bar"}'
        }
      }

      return assertPrepareQueryHasResult(options, req, {}, {
        query: {
          foo: { $lte: 'bar' }
        }
      })
    })

    it('converts < to $lt', () => {
      let req = {
        query: {
          query: '{"foo":"<bar"}'
        }
      }

      return assertPrepareQueryHasResult(options, req, {}, {
        query: {
          foo: { $lt: 'bar' }
        }
      })
    })

    it('converts != to $ne', () => {
      let req = {
        query: {
          query: '{"foo":"!=bar"}'
        }
      }

      return assertPrepareQueryHasResult(options, req, {}, {
        query: {
          foo: { $ne: 'bar' }
        }
      })
    })

    // This feature was disabled because it requires MongoDB 3
    it.skip('converts = to $eq', () => {
      let req = {
        query: {
          query: '{"foo":"=bar"}'
        }
      }

      return assertPrepareQueryHasResult(options, req, {}, {
        query: {
          foo: { $eq: 'bar' }
        }
      })
    })

    it('converts [] to $in', () => {
      let req = {
        query: {
          query: '{"foo":["bar"]}'
        }
      }

      return assertPrepareQueryHasResult(options, req, {}, {
        query: {
          foo: { $in: ['bar'] }
        }
      })
    })
  })

  it('calls next when query is empty', () => {
    return assertPrepareQueryHasResult(options, {}, {})
  })

  it('ignores keys that are not whitelisted and calls next', () => {
    let req = {
      query: {
        foo: 'bar'
      }
    }

    return assertPrepareQueryHasResult(options, req, {})
  })

  it('calls next when query key is valid json', () => {
    let req = {
      query: {
        query: '{"foo":"bar"}'
      }
    }

    return assertPrepareQueryHasResult(options, req, {},
      {
        query: JSON.parse(req.query.query)
      }
    )
  })

  it('calls onError when query key is invalid json', () => {
    let req = {
      erm: {},
      params: {},
      query: {
        query: 'not json'
      }
    }

    return assertPrepareQueryThrowsError(options, req, {}, new Error('invalid_json_query'))
  })

  it('calls next when sort key is valid json', () => {
    let req = {
      query: {
        sort: '{"foo":"bar"}'
      }
    }

    return assertPrepareQueryHasResult(options, req, {},
      {
        sort: JSON.parse(req.query.sort)
      }
    )
  })

  it('calls next when sort key is a string', () => {
    let req = {
      query: {
        sort: 'foo'
      }
    }

    return assertPrepareQueryHasResult(options, req, {}, req.query)
  })

  it('calls next when skip key is a string', () => {
    let req = {
      query: {
        skip: '1'
      }
    }

    return assertPrepareQueryHasResult(options, req, {}, req.query)
  })

  it('calls next when limit key is a string', () => {
    let req = {
      query: {
        limit: '1'
      }
    }

    return assertPrepareQueryHasResult(options, req, {}, req.query)
  })

  it('calls next when distinct key is a string', () => {
    let req = {
      query: {
        distinct: 'foo'
      }
    }

    return assertPrepareQueryHasResult(options, req, {}, req.query)
  })

  it('calls next when populate key is a string', () => {
    let req = {
      query: {
        populate: 'foo'
      }
    }

    return assertPrepareQueryHasResult(options, req, {},
      {
        populate: [{
          path: 'foo'
        }]
      }
    )
  })

  describe('select', () => {
    it('parses a string to include fields', () => {
      let req = {
        query: {
          select: 'foo'
        }
      }

      return assertPrepareQueryHasResult(options, req, {},
        {
          select: {
            foo: 1
          }
        }
      )
    })

    it('parses a string to exclude fields', () => {
      let req = {
        query: {
          select: '-foo'
        }
      }

      return assertPrepareQueryHasResult(options, req, {},
        {
          select: {
            foo: 0
          }
        }
      )
    })

    it('parses a comma separated list of fields to include', () => {
      let req = {
        query: {
          select: 'foo,bar'
        }
      }

      return assertPrepareQueryHasResult(options, req, {},
        {
          select: {
            foo: 1,
            bar: 1
          }
        }
      )
    })

    it('parses a comma separated list of fields to exclude', () => {
      let req = {
        query: {
          select: '-foo,-bar'
        }
      }

      return assertPrepareQueryHasResult(options, req, {}, {
        select: {
          foo: 0,
          bar: 0
        }
      })
    })

    it('parses a comma separated list of nested fields', () => {
      let req = {
        query: {
          select: 'foo.bar,baz.qux.quux'
        }
      }

      return assertPrepareQueryHasResult(options, req, {}, {
        select: {
          'foo.bar': 1,
          'baz.qux.quux': 1
        }
      })
    })
  })

  describe('populate', () => {
    it('parses a string to populate a path', () => {
      let req = {
        query: {
          populate: 'foo'
        }
      }

      return assertPrepareQueryHasResult(options, req, {}, {
        populate: [{
          path: 'foo'
        }]
      })
    })

    it('parses a string to populate multiple paths', () => {
      let req = {
        query: {
          populate: 'foo,bar'
        }
      }

      return assertPrepareQueryHasResult(options, req, {}, {
        populate: [{
          path: 'foo'
        }, {
          path: 'bar'
        }]
      })
    })

    it('accepts an object to populate a path', () => {
      let req = {
        query: {
          populate: {
            path: 'foo.bar',
            select: 'baz',
            match: { 'qux': 'quux' },
            options: { sort: 'baz' }
          }
        }
      }

      return assertPrepareQueryHasResult(options, req, {}, {
        populate: [{
          path: 'foo.bar',
          select: 'baz',
          match: { 'qux': 'quux' },
          options: { sort: 'baz' }
        }]
      })
    })

    it('parses a string to populate and select fields', () => {
      let req = {
        query: {
          populate: 'foo',
          select: 'foo.bar,foo.baz'
        }
      }

      return assertPrepareQueryHasResult(options, req, {}, {
        populate: [{
          path: 'foo',
          select: 'bar baz'
        }]
      })
    })
  })
})
