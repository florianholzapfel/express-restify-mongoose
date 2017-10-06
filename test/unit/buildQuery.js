'use strict'

const assert = require('assert')
const sinon = require('sinon')

describe('buildQuery', () => {
  const buildQuery = require('../../src/buildQuery')

  let query = {
    where: sinon.spy(),
    skip: sinon.spy(),
    limit: sinon.spy(),
    sort: sinon.spy(),
    select: sinon.spy(),
    populate: sinon.spy(),
    distinct: sinon.spy()
  }

  afterEach(() => {
    for (let key in query) {
      query[key].reset()
    }
  })

  it('does not call any methods and returns a query object', () => {
    return buildQuery({})(query).then((result) => {
      for (let key in query) {
        sinon.assert.notCalled(query[key])
      }

      assert.equal(result, query)
    })
  })

  describe('query', () => {
    it('calls where and returns a query object', () => {
      let queryOptions = {
        query: 'foo'
      }

      return buildQuery({})(query, queryOptions).then((result) => {
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
  })

  describe('skip', () => {
    it('calls skip and returns a query object', () => {
      let queryOptions = {
        skip: '1'
      }

      return buildQuery({})(query, queryOptions).then((result) => {
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
  })

  describe('limit', () => {
    it('calls limit and returns a query object', () => {
      let queryOptions = {
        limit: '1'
      }

      return buildQuery({})(query, queryOptions).then((result) => {
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
    })

    it('calls limit and returns a query object', () => {
      let options = {
        limit: 1
      }

      let queryOptions = {
        limit: '2'
      }

      return buildQuery(options)(query, queryOptions).then((result) => {
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
    })

    it('does not call limit on count endpoint and returns a query object', () => {
      let queryOptions = {
        limit: '2'
      }

      query.op = 'count'

      return buildQuery({})(query, queryOptions).then((result) => {
        delete query.op

        for (let key in query) {
          sinon.assert.notCalled(query[key])
        }

        assert.equal(result, query)
      })
    })

    it('does not call limit on count endpoint and returns a query object', () => {
      let options = {
        limit: 1
      }

      let queryOptions = {
        limit: '2'
      }

      query.op = 'count'

      return buildQuery(options)(query, queryOptions).then((result) => {
        delete query.op

        for (let key in query) {
          sinon.assert.notCalled(query[key])
        }

        assert.equal(result, query)
      })
    })

    it('does not call limit on queries that have a distinct option set and returns the query object', () => {
      let options = {
        limit: 1
      }

      let queryOptions = {
        distinct: 'name'
      }

      return buildQuery(options)(query, queryOptions).then((result) => {
        for (let key in query) {
          if (key === 'distinct') continue
          sinon.assert.notCalled(query[key])
        }
        sinon.assert.called(query.distinct)

        assert.equal(result, query)
      })
    })
  })

  describe('sort', () => {
    it('calls sort and returns a query object', () => {
      let queryOptions = {
        sort: 'foo'
      }

      return buildQuery({})(query, queryOptions).then((result) => {
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
  })

  describe('select', () => {
    it('accepts an object', () => {
      let queryOptions = {
        select: {
          foo: 1,
          bar: 0
        }
      }

      return buildQuery({})(query, queryOptions).then((result) => {
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
  })

  describe('populate', () => {
    it('accepts an object wrapped in an array to populate a path', () => {
      let queryOptions = {
        populate: [{
          path: 'foo.bar',
          select: 'baz',
          match: { 'qux': 'quux' },
          options: { sort: 'baz' }
        }]
      }

      return buildQuery({})(query, queryOptions).then((result) => {
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
  })

  describe('distinct', () => {
    it('calls distinct and returns a query object', () => {
      let queryOptions = {
        distinct: 'foo'
      }

      return buildQuery({})(query, queryOptions).then((result) => {
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
})
