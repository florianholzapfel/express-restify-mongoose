var assert = require('assert')
var sinon = require('sinon')

describe('prepareQuery', function () {
  var prepareQuery = require('../../../lib/middleware/prepareQuery')

  var options = {
    onError: sinon.spy()
  }

  var next = sinon.spy()

  afterEach(function () {
    options.onError.reset()
    next.reset()
  })

  describe('jsonQueryParser', function () {
    it('converts ~ to a case insensitive regex', function () {
      var req = {
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

    it('converts >= to $gte', function () {
      var req = {
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

    it('converts > to $gt', function () {
      var req = {
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

    it('converts <= to $lte', function () {
      var req = {
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

    it('converts < to $lt', function () {
      var req = {
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

    it('converts != to $ne', function () {
      var req = {
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
    it.skip('converts = to $eq', function () {
      var req = {
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

    it('converts [] to $in', function () {
      var req = {
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

  it('calls next when query is empty', function () {
    prepareQuery(options)({}, {}, next)

    sinon.assert.calledOnce(next)
    sinon.assert.calledWithExactly(next)
    sinon.assert.notCalled(options.onError)
  })

  it('ignores keys that are not whitelisted and calls next', function () {
    var req = {
      query: {
        foo: 'bar'
      }
    }

    prepareQuery(options)(req, {}, next)

    sinon.assert.calledOnce(next)
    sinon.assert.calledWithExactly(next)
    sinon.assert.notCalled(options.onError)
  })

  it('calls next when query key is valid json', function () {
    var req = {
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

  it('calls onError when query key is invalid json', function () {
    var req = {
      query: {
        query: 'not json'
      }
    }

    var err = new Error('query must be a valid JSON string')
    err.description = 'invalid_json'
    err.statusCode = 400

    prepareQuery(options)(req, {}, next)

    sinon.assert.calledOnce(options.onError)
    sinon.assert.calledWithExactly(options.onError, err, req, {}, next)
    sinon.assert.notCalled(next)
  })

  it('calls next when sort key is valid json', function () {
    var req = {
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

  it('calls next when sort key is a string', function () {
    var req = {
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

  it('calls next when skip key is a string', function () {
    var req = {
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

  it('calls next when limit key is a string', function () {
    var req = {
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

  it('calls next when distinct key is a string', function () {
    var req = {
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

  it('calls next when populate key is a string', function () {
    var req = {
      query: {
        populate: 'foo'
      }
    }

    prepareQuery(options)(req, {}, next)

    assert.deepEqual(req._ermQueryOptions, req.query)
    sinon.assert.calledOnce(next)
    sinon.assert.calledWithExactly(next)
    sinon.assert.notCalled(options.onError)
  })

  it('calls next when select key is valid json', function () {
    var req = {
      query: {
        select: '{"foo":"bar"}'
      }
    }

    prepareQuery(options)(req, {}, next)

    assert.deepEqual(req._ermQueryOptions, {
      select: JSON.parse(req.query.select)
    })
    sinon.assert.calledOnce(next)
    sinon.assert.calledWithExactly(next)
    sinon.assert.notCalled(options.onError)
  })

  it('calls next when select key is a string', function () {
    var req = {
      query: {
        select: 'foo'
      }
    }

    prepareQuery(options)(req, {}, next)

    assert.deepEqual(req._ermQueryOptions, req.query)
    sinon.assert.calledOnce(next)
    sinon.assert.calledWithExactly(next)
    sinon.assert.notCalled(options.onError)
  })
})
