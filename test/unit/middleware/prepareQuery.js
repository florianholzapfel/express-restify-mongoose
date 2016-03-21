const assert = require('assert')
const sinon = require('sinon')

describe('prepareQuery', () => {
  const prepareQuery = require('../../../lib/middleware/prepareQuery')

  let options = {
    onError: sinon.spy(),
    allowRegex: true
  }

  let next = sinon.spy()

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

      prepareQuery(options)(req, {}, next)

      assert.deepEqual(req._ermQueryOptions, {
        query: {
          foo: new RegExp('bar', 'i')
        }
      })
      sinon.assert.calledOnce(next)
      sinon.assert.calledWithExactly(next)
      sinon.assert.notCalled(options.onError)
    })

    it('converts ~ to undefined', () => {
      let req = {
        query: {
          query: '{"foo":"~bar"}'
        }
      }

      options.allowRegex = false

      prepareQuery(options)(req, {}, next)

      assert.deepEqual(req._ermQueryOptions, {
        query: {}
      })
      sinon.assert.calledOnce(next)
      sinon.assert.calledWithExactly(next)
      sinon.assert.notCalled(options.onError)
    })

    it('converts $regex to undefined', () => {
      let req = {
        query: {
          query: '{"foo":{"$regex":"bar"}}'
        }
      }

      options.allowRegex = false

      prepareQuery(options)(req, {}, next)

      assert.deepEqual(req._ermQueryOptions, {
        query: {
          foo: {}
        }
      })
      sinon.assert.calledOnce(next)
      sinon.assert.calledWithExactly(next)
      sinon.assert.notCalled(options.onError)
    })

    it('converts >= to $gte', () => {
      let req = {
        query: {
          query: '{"foo":">=bar"}'
        }
      }

      prepareQuery(options)(req, {}, next)

      assert.deepEqual(req._ermQueryOptions, {
        query: {
          foo: { $gte: 'bar' }
        }
      })
      sinon.assert.calledOnce(next)
      sinon.assert.calledWithExactly(next)
      sinon.assert.notCalled(options.onError)
    })

    it('converts > to $gt', () => {
      let req = {
        query: {
          query: '{"foo":">bar"}'
        }
      }

      prepareQuery(options)(req, {}, next)

      assert.deepEqual(req._ermQueryOptions, {
        query: {
          foo: { $gt: 'bar' }
        }
      })
      sinon.assert.calledOnce(next)
      sinon.assert.calledWithExactly(next)
      sinon.assert.notCalled(options.onError)
    })

    it('converts <= to $lte', () => {
      let req = {
        query: {
          query: '{"foo":"<=bar"}'
        }
      }

      prepareQuery(options)(req, {}, next)

      assert.deepEqual(req._ermQueryOptions, {
        query: {
          foo: { $lte: 'bar' }
        }
      })
      sinon.assert.calledOnce(next)
      sinon.assert.calledWithExactly(next)
      sinon.assert.notCalled(options.onError)
    })

    it('converts < to $lt', () => {
      let req = {
        query: {
          query: '{"foo":"<bar"}'
        }
      }

      prepareQuery(options)(req, {}, next)

      assert.deepEqual(req._ermQueryOptions, {
        query: {
          foo: { $lt: 'bar' }
        }
      })
      sinon.assert.calledOnce(next)
      sinon.assert.calledWithExactly(next)
      sinon.assert.notCalled(options.onError)
    })

    it('converts != to $ne', () => {
      let req = {
        query: {
          query: '{"foo":"!=bar"}'
        }
      }

      prepareQuery(options)(req, {}, next)

      assert.deepEqual(req._ermQueryOptions, {
        query: {
          foo: { $ne: 'bar' }
        }
      })
      sinon.assert.calledOnce(next)
      sinon.assert.calledWithExactly(next)
      sinon.assert.notCalled(options.onError)
    })

    // This feature was disabled because it requires MongoDB 3
    it.skip('converts = to $eq', () => {
      let req = {
        query: {
          query: '{"foo":"=bar"}'
        }
      }

      prepareQuery(options)(req, {}, next)

      assert.deepEqual(req._ermQueryOptions, {
        query: {
          foo: { $eq: 'bar' }
        }
      })
      sinon.assert.calledOnce(next)
      sinon.assert.calledWithExactly(next)
      sinon.assert.notCalled(options.onError)
    })

    it('converts [] to $in', () => {
      let req = {
        query: {
          query: '{"foo":["bar"]}'
        }
      }

      prepareQuery(options)(req, {}, next)

      assert.deepEqual(req._ermQueryOptions, {
        query: {
          foo: { $in: ['bar'] }
        }
      })
      sinon.assert.calledOnce(next)
      sinon.assert.calledWithExactly(next)
      sinon.assert.notCalled(options.onError)
    })
  })

  it('calls next when query is empty', () => {
    prepareQuery(options)({}, {}, next)

    sinon.assert.calledOnce(next)
    sinon.assert.calledWithExactly(next)
    sinon.assert.notCalled(options.onError)
  })

  it('ignores keys that are not whitelisted and calls next', () => {
    let req = {
      query: {
        foo: 'bar'
      }
    }

    prepareQuery(options)(req, {}, next)

    sinon.assert.calledOnce(next)
    sinon.assert.calledWithExactly(next)
    sinon.assert.notCalled(options.onError)
  })

  it('calls next when query key is valid json', () => {
    let req = {
      query: {
        query: '{"foo":"bar"}'
      }
    }

    prepareQuery(options)(req, {}, next)

    assert.deepEqual(req._ermQueryOptions, {
      query: JSON.parse(req.query.query)
    })
    sinon.assert.calledOnce(next)
    sinon.assert.calledWithExactly(next)
    sinon.assert.notCalled(options.onError)
  })

  it('calls onError when query key is invalid json', () => {
    let req = {
      erm: {},
      params: {},
      query: {
        query: 'not json'
      }
    }

    prepareQuery(options)(req, {}, next)

    sinon.assert.calledOnce(options.onError)
    sinon.assert.calledWithExactly(options.onError, new Error('invalid_json_query'), req, {}, next)
    sinon.assert.notCalled(next)
  })

  it('calls next when sort key is valid json', () => {
    let req = {
      query: {
        sort: '{"foo":"bar"}'
      }
    }

    prepareQuery(options)(req, {}, next)

    assert.deepEqual(req._ermQueryOptions, {
      sort: JSON.parse(req.query.sort)
    })
    sinon.assert.calledOnce(next)
    sinon.assert.calledWithExactly(next)
    sinon.assert.notCalled(options.onError)
  })

  it('calls next when sort key is a string', () => {
    let req = {
      query: {
        sort: 'foo'
      }
    }

    prepareQuery(options)(req, {}, next)

    assert.deepEqual(req._ermQueryOptions, req.query)
    sinon.assert.calledOnce(next)
    sinon.assert.calledWithExactly(next)
    sinon.assert.notCalled(options.onError)
  })

  it('calls next when skip key is a string', () => {
    let req = {
      query: {
        skip: '1'
      }
    }

    prepareQuery(options)(req, {}, next)

    assert.deepEqual(req._ermQueryOptions, req.query)
    sinon.assert.calledOnce(next)
    sinon.assert.calledWithExactly(next)
    sinon.assert.notCalled(options.onError)
  })

  it('calls next when limit key is a string', () => {
    let req = {
      query: {
        limit: '1'
      }
    }

    prepareQuery(options)(req, {}, next)

    assert.deepEqual(req._ermQueryOptions, req.query)
    sinon.assert.calledOnce(next)
    sinon.assert.calledWithExactly(next)
    sinon.assert.notCalled(options.onError)
  })

  it('calls next when distinct key is a string', () => {
    let req = {
      query: {
        distinct: 'foo'
      }
    }

    prepareQuery(options)(req, {}, next)

    assert.deepEqual(req._ermQueryOptions, req.query)
    sinon.assert.calledOnce(next)
    sinon.assert.calledWithExactly(next)
    sinon.assert.notCalled(options.onError)
  })

  it('calls next when populate key is a string', () => {
    let req = {
      query: {
        populate: 'foo'
      }
    }

    prepareQuery(options)(req, {}, next)

    assert.deepEqual(req._ermQueryOptions, {
      populate: [{
        path: 'foo'
      }]
    })
    sinon.assert.calledOnce(next)
    sinon.assert.calledWithExactly(next)
    sinon.assert.notCalled(options.onError)
  })

  describe('select', () => {
    it('parses a string to include fields', () => {
      let req = {
        query: {
          select: 'foo'
        }
      }

      prepareQuery(options)(req, {}, next)

      assert.deepEqual(req._ermQueryOptions, {
        select: {
          foo: 1
        }
      })
      sinon.assert.calledOnce(next)
      sinon.assert.calledWithExactly(next)
      sinon.assert.notCalled(options.onError)
    })

    it('parses a string to exclude fields', () => {
      let req = {
        query: {
          select: '-foo'
        }
      }

      prepareQuery(options)(req, {}, next)

      assert.deepEqual(req._ermQueryOptions, {
        select: {
          foo: 0
        }
      })
      sinon.assert.calledOnce(next)
      sinon.assert.calledWithExactly(next)
      sinon.assert.notCalled(options.onError)
    })

    it('parses a comma separated list of fields to include', () => {
      let req = {
        query: {
          select: 'foo,bar'
        }
      }

      prepareQuery(options)(req, {}, next)

      assert.deepEqual(req._ermQueryOptions, {
        select: {
          foo: 1,
          bar: 1
        }
      })
      sinon.assert.calledOnce(next)
      sinon.assert.calledWithExactly(next)
      sinon.assert.notCalled(options.onError)
    })

    it('parses a comma separated list of fields to exclude', () => {
      let req = {
        query: {
          select: '-foo,-bar'
        }
      }

      prepareQuery(options)(req, {}, next)

      assert.deepEqual(req._ermQueryOptions, {
        select: {
          foo: 0,
          bar: 0
        }
      })
      sinon.assert.calledOnce(next)
      sinon.assert.calledWithExactly(next)
      sinon.assert.notCalled(options.onError)
    })

    it('parses a comma separated list of nested fields', () => {
      let req = {
        query: {
          select: 'foo.bar,baz.qux.quux'
        }
      }

      prepareQuery(options)(req, {}, next)

      assert.deepEqual(req._ermQueryOptions, {
        select: {
          'foo.bar': 1,
          'baz.qux.quux': 1
        }
      })
      sinon.assert.calledOnce(next)
      sinon.assert.calledWithExactly(next)
      sinon.assert.notCalled(options.onError)
    })
  })

  describe('populate', () => {
    it('parses a string to populate a path', () => {
      let req = {
        query: {
          populate: 'foo'
        }
      }

      prepareQuery(options)(req, {}, next)

      assert.deepEqual(req._ermQueryOptions, {
        populate: [{
          path: 'foo'
        }]
      })
      sinon.assert.calledOnce(next)
      sinon.assert.calledWithExactly(next)
      sinon.assert.notCalled(options.onError)
    })

    it('parses a string to populate multiple paths', () => {
      let req = {
        query: {
          populate: 'foo,bar'
        }
      }

      prepareQuery(options)(req, {}, next)

      assert.deepEqual(req._ermQueryOptions, {
        populate: [{
          path: 'foo'
        }, {
          path: 'bar'
        }]
      })
      sinon.assert.calledOnce(next)
      sinon.assert.calledWithExactly(next)
      sinon.assert.notCalled(options.onError)
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

      prepareQuery(options)(req, {}, next)

      assert.deepEqual(req._ermQueryOptions, {
        populate: [{
          path: 'foo.bar',
          select: 'baz',
          match: { 'qux': 'quux' },
          options: { sort: 'baz' }
        }]
      })
      sinon.assert.calledOnce(next)
      sinon.assert.calledWithExactly(next)
      sinon.assert.notCalled(options.onError)
    })

    it('parses a string to populate and select fields', () => {
      let req = {
        query: {
          populate: 'foo',
          select: 'foo.bar,foo.baz'
        }
      }

      prepareQuery(options)(req, {}, next)

      assert.deepEqual(req._ermQueryOptions, {
        populate: [{
          path: 'foo',
          select: 'bar baz'
        }]
      })
      sinon.assert.calledOnce(next)
      sinon.assert.calledWithExactly(next)
      sinon.assert.notCalled(options.onError)
    })
  })
})
