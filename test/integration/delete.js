const assert = require('assert')
const mongoose = require('mongoose')
const request = require('request')
const util = require('util')

module.exports = function (createFn, setup, dismantle) {
  const erm = require('../../lib/express-restify-mongoose')
  const db = require('./setup')()

  const testPort = 30023
  const testUrl = `http://localhost:${testPort}`
  const invalidId = 'invalid-id'
  const randomId = mongoose.Types.ObjectId().toHexString()

  describe('Delete documents', () => {
    describe('findOneAndRemove: true', () => {
      let app = createFn()
      let server
      let customer

      beforeEach(done => {
        setup(err => {
          if (err) {
            return done(err)
          }

          erm.serve(app, db.models.Customer, {
            findOneAndRemove: true,
            restify: app.isRestify
          })

          db.models.Customer.create([{
            name: 'Bob'
          }, {
            name: 'John'
          }, {
            name: 'Mike'
          }]).then(createdCustomers => {
            customer = createdCustomers[0]
            server = app.listen(testPort, done)
          }, err => {
            done(err)
          })
        })
      })

      afterEach(done => {
        dismantle(app, server, done)
      })

      it('DELETE /Customers 204 - no id', done => {
        request.del({
          url: `${testUrl}/api/v1/Customers`
        }, (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 204)
          done()
        })
      })

      it('DELETE /Customers/:id 204 - created id', done => {
        request.del({
          url: `${testUrl}/api/v1/Customers/${customer._id}`
        }, (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 204)
          done()
        })
      })

      it('DELETE /Customers/:id 400 - invalid id', done => {
        request.del({
          url: util.format('%s/api/v1/Customers/%s', testUrl, invalidId)
        }, (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 400)
          done()
        })
      })

      it('DELETE /Customers/:id 404 - random id', done => {
        request.del({
          url: util.format('%s/api/v1/Customers/%s', testUrl, randomId)
        }, (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 404)
          done()
        })
      })

      it('DELETE /Customers?query={"name":"John"} 200 - exact match', done => {
        request.del({
          url: `${testUrl}/api/v1/Customers`,
          qs: {
            query: JSON.stringify({
              name: 'John'
            })
          },
          json: true
        }, (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 204)

          db.models.Customer.find({}, (err, customers) => {
            assert.ok(!err)
            assert.equal(customers.length, 2)
            customers.forEach(customer => {
              assert.ok(customer.name !== 'John')
            })
            done()
          })
        })
      })
    })

    describe('findOneAndRemove: false', () => {
      let app = createFn()
      let server
      let customer

      beforeEach(done => {
        setup(err => {
          if (err) {
            return done(err)
          }

          erm.serve(app, db.models.Customer, {
            findOneAndRemove: false,
            restify: app.isRestify
          })

          db.models.Customer.create([{
            name: 'Bob'
          }, {
            name: 'John'
          }, {
            name: 'Mike'
          }]).then(createdCustomers => {
            customer = createdCustomers[0]
            server = app.listen(testPort, done)
          }, err => {
            done(err)
          })
        })
      })

      afterEach(done => {
        dismantle(app, server, done)
      })

      it('DELETE /Customers 204 - no id', done => {
        request.del({
          url: `${testUrl}/api/v1/Customers`
        }, (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 204)
          done()
        })
      })

      it('DELETE /Customers/:id 204 - created id', done => {
        request.del({
          url: `${testUrl}/api/v1/Customers/${customer._id}`
        }, (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 204)
          done()
        })
      })

      it('DELETE /Customers/:id 400 - invalid id', done => {
        request.del({
          url: util.format('%s/api/v1/Customers/%s', testUrl, invalidId)
        }, (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 400)
          done()
        })
      })

      it('DELETE /Customers/:id 404 - random id', done => {
        request.del({
          url: util.format('%s/api/v1/Customers/%s', testUrl, randomId)
        }, (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 404)
          done()
        })
      })

      it('DELETE /Customers?query={"name":"John"} 200 - exact match', done => {
        request.del({
          url: `${testUrl}/api/v1/Customers`,
          qs: {
            query: JSON.stringify({
              name: 'John'
            })
          },
          json: true
        }, (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 204)

          db.models.Customer.find({}, (err, customers) => {
            assert.ok(!err)
            assert.equal(customers.length, 2)
            customers.forEach(customer => {
              assert.ok(customer.name !== 'John')
            })
            done()
          })
        })
      })
    })
  })
}
