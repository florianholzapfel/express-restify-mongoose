const assert = require('assert')
const sinon = require('sinon')
const _ = require('lodash')

describe('access', () => {
  const access = require('../../../lib/middleware/access')

  let next = sinon.spy()

  afterEach(() => {
    next.reset()
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

    it('calls onError', done => {
      let req = {
        erm: {},
        params: {}
      }
      let err = new Error('Something bad happened')

      access({
        access: (req, cb) => {
          return cb(err, 'private')
        },
        onError: (errInner, reqInner, res, nextInner) => {
          assert.strictEqual(errInner, err)
          assert.strictEqual(reqInner, req)
          assert.ok(_.isEmpty(res))
          assert.strictEqual(nextInner, next)
          sinon.assert.notCalled(next)
          assert.equal(req.access, undefined)
          done()
        }
      })(req, {}, next)
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
