var assert = require('assert')
var sinon = require('sinon')

describe('buildQuery', function () {
  var buildQuery = require('../../lib/buildQuery')

  var query = {
    where: sinon.spy(),
    skip: sinon.spy(),
    limit: sinon.spy(),
    sort: sinon.spy(),
    select: sinon.spy(),
    populate: sinon.spy(),
    distinct: sinon.spy()
  }

  afterEach(function () {
    for (var key in query) {
      query[key].reset()
    }
  })

  it('does not call any methods and returns a query object', function () {
    var result = buildQuery({})(query)

    for (var key in query) {
      sinon.assert.notCalled(query[key])
    }

    assert.equal(result, query)
  })

  describe('query', function () {
    it('calls where and returns a query object', function () {
      var queryOptions = {
        query: 'foo'
      }

      var result = buildQuery({})(query, queryOptions)

      sinon.assert.calledOnce(query.where)
      sinon.assert.calledWithExactly(query.where, queryOptions.query)
      sinon.assert.notCalled(query.skip)
      sinon.assert.notCalled(query.limit)
      sinon.assert.notCalled(query.sort)
      sinon.assert.notCalled(query.select)
      sinon.assert.notCalled(query.populate)
      sinon.assert.notCalled(query.distinct)
      assert.equal(result, query)
    })
  })

  describe('skip', function () {
    it('calls skip and returns a query object', function () {
      var queryOptions = {
        skip: '1'
      }

      var result = buildQuery({})(query, queryOptions)

      sinon.assert.calledOnce(query.skip)
      sinon.assert.calledWithExactly(query.skip, queryOptions.skip)
      sinon.assert.notCalled(query.where)
      sinon.assert.notCalled(query.limit)
      sinon.assert.notCalled(query.sort)
      sinon.assert.notCalled(query.select)
      sinon.assert.notCalled(query.populate)
      sinon.assert.notCalled(query.distinct)
      assert.equal(result, query)
    })
  })

  describe('limit', function () {
    it('calls limit and returns a query object', function () {
      var queryOptions = {
        limit: '1'
      }

      var result = buildQuery({})(query, queryOptions)

      sinon.assert.calledOnce(query.limit)
      sinon.assert.calledWithExactly(query.limit, queryOptions.limit)
      sinon.assert.notCalled(query.where)
      sinon.assert.notCalled(query.skip)
      sinon.assert.notCalled(query.sort)
      sinon.assert.notCalled(query.select)
      sinon.assert.notCalled(query.populate)
      sinon.assert.notCalled(query.distinct)
      assert.equal(result, query)
    })

    it('calls limit and returns a query object', function () {
      var options = {
        limit: 1
      }

      var queryOptions = {
        limit: '2'
      }

      var result = buildQuery(options)(query, queryOptions)

      sinon.assert.calledOnce(query.limit)
      sinon.assert.calledWithExactly(query.limit, options.limit)
      sinon.assert.notCalled(query.where)
      sinon.assert.notCalled(query.skip)
      sinon.assert.notCalled(query.sort)
      sinon.assert.notCalled(query.select)
      sinon.assert.notCalled(query.populate)
      sinon.assert.notCalled(query.distinct)
      assert.equal(result, query)
    })

    it('does not call limit on count endpoint and returns a query object', function () {
      var queryOptions = {
        limit: '2'
      }

      query.op = 'count'
      var result = buildQuery({})(query, queryOptions)
      delete query.op

      for (var key in query) {
        sinon.assert.notCalled(query[key])
      }

      assert.equal(result, query)
    })

    it('does not call limit on count endpoint and returns a query object', function () {
      var options = {
        limit: 1
      }

      var queryOptions = {
        limit: '2'
      }

      query.op = 'count'
      var result = buildQuery(options)(query, queryOptions)
      delete query.op

      for (var key in query) {
        sinon.assert.notCalled(query[key])
      }

      assert.equal(result, query)
    })
  })

  describe('sort', function () {
    it('calls sort and returns a query object', function () {
      var queryOptions = {
        sort: 'foo'
      }

      var result = buildQuery({})(query, queryOptions)

      sinon.assert.calledOnce(query.sort)
      sinon.assert.calledWithExactly(query.sort, queryOptions.sort)
      sinon.assert.notCalled(query.where)
      sinon.assert.notCalled(query.skip)
      sinon.assert.notCalled(query.limit)
      sinon.assert.notCalled(query.select)
      sinon.assert.notCalled(query.populate)
      sinon.assert.notCalled(query.distinct)
      assert.equal(result, query)
    })
  })

  describe('select', function () {
    it('accepts an object', function () {
      var queryOptions = {
        select: {
          foo: 1,
          bar: 0
        }
      }

      var result = buildQuery({})(query, queryOptions)

      sinon.assert.calledOnce(query.select)
      sinon.assert.calledWithExactly(query.select, {
        foo: 1,
        bar: 0
      })
      sinon.assert.notCalled(query.where)
      sinon.assert.notCalled(query.skip)
      sinon.assert.notCalled(query.limit)
      sinon.assert.notCalled(query.sort)
      sinon.assert.notCalled(query.populate)
      sinon.assert.notCalled(query.distinct)
      assert.equal(result, query)
    })
  })

  describe('populate', function () {
    it('accepts an object wrapped in an array to populate a path', function () {
      var queryOptions = {
        populate: [{
          path: 'foo.bar',
          select: 'baz',
          match: { 'qux': 'quux' },
          options: { sort: 'baz' }
        }]
      }

      var result = buildQuery({})(query, queryOptions)

      sinon.assert.calledOnce(query.populate)
      sinon.assert.calledWithExactly(query.populate, [{
        path: 'foo.bar',
        select: 'baz',
        match: { 'qux': 'quux' },
        options: { sort: 'baz' }
      }])
      sinon.assert.notCalled(query.where)
      sinon.assert.notCalled(query.skip)
      sinon.assert.notCalled(query.limit)
      sinon.assert.notCalled(query.select)
      sinon.assert.notCalled(query.sort)
      sinon.assert.notCalled(query.distinct)
      assert.equal(result, query)
    })
  })

  describe('distinct', function () {
    it('calls distinct and returns a query object', function () {
      var queryOptions = {
        distinct: 'foo'
      }

      var result = buildQuery({})(query, queryOptions)

      sinon.assert.calledOnce(query.distinct)
      sinon.assert.calledWithExactly(query.distinct, 'foo')
      sinon.assert.notCalled(query.where)
      sinon.assert.notCalled(query.skip)
      sinon.assert.notCalled(query.limit)
      sinon.assert.notCalled(query.sort)
      sinon.assert.notCalled(query.populate)
      sinon.assert.notCalled(query.select)
      assert.equal(result, query)
    })
  })
})
