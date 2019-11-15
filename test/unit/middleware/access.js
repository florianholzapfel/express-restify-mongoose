'use strict'

const assert = require('assert')
const sinon = require('sinon')

describe('access', () => {
  const access = require('../../../src/middleware/access')

  let next = sinon.spy()

  afterEach(() => {
    next.resetHistory()
  })

  describe('returns (sync)', () => {
    it('adds access field to req', () => {
      let req = {}

      access({
        access: () => {
          return 'private'
        }
      })(req, {}, next)

      sinon.assert.calledOnce(next)
      sinon.assert.calledWithExactly(next)
      assert.equal(req.access, 'private')
    })

    it('throws an exception with unsupported parameter', () => {
      let req = {}

      assert.throws(() => {
        access({
          access: () => {
            return 'foo'
          }
        })(req, {}, next)
      }, 'Unsupported access, must be "public", "private" or "protected"')

      sinon.assert.notCalled(next)
      assert.equal(req.access, undefined)
    })
  })

  describe('yields (async)', () => {
    it('adds access field to req', () => {
      let req = {}

      access({
        access: (req, cb) => {
          return cb(null, 'private')
        }
      })(req, {}, next)

      sinon.assert.calledOnce(next)
      sinon.assert.calledWithExactly(next)
      assert.equal(req.access, 'private')
    })

    it('calls onError', () => {
      let req = {
        erm: {},
        params: {}
      }
      let onError = sinon.spy()
      let err = new Error('Something bad happened')

      access({
        access: (req, cb) => {
          return cb(err, 'private')
        },
        onError: onError
      })(req, {}, next)

      sinon.assert.calledOnce(onError)
      sinon.assert.calledWithExactly(onError, err, req, {}, next)
      sinon.assert.notCalled(next)
      assert.equal(req.access, undefined)
    })

    it('throws an exception with unsupported parameter', () => {
      let req = {}

      assert.throws(() => {
        access({
          access: (req, cb) => {
            return cb(null, 'foo')
          }
        })(req, {}, next)
      }, 'Unsupported access, must be "public", "private" or "protected"')

      sinon.assert.notCalled(next)
      assert.equal(req.access, undefined)
    })
  })
})
