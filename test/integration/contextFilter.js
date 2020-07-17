'use strict'

const assert = require('assert')
const request = require('request')

module.exports = function (createFn, setup, dismantle) {
  const erm = require('../../src/express-restify-mongoose')
  const db = require('./setup')()

  const testPort = 30023
  const testUrl = `http://localhost:${testPort}`
  const updateMethods = ['PATCH', 'POST', 'PUT']

  describe('contextFilter', () => {
    let app = createFn()
    let server
    let customers

    let contextFilter = function (model, req, done) {
      done(
        model.find({
          name: { $ne: 'Bob' },
          age: { $lt: 36 },
        })
      )
    }

    beforeEach((done) => {
      setup((err) => {
        if (err) {
          return done(err)
        }

        erm.serve(app, db.models.Customer, {
          contextFilter: contextFilter,
          restify: app.isRestify,
        })

        db.models.Customer.create([
          {
            name: 'Bob',
            age: 12,
          },
          {
            name: 'John',
            age: 24,
          },
          {
            name: 'Mike',
            age: 36,
          },
        ])
          .then((createdCustomers) => {
            customers = createdCustomers
            server = app.listen(testPort, done)
          })
          .catch(done)
      })
    })

    afterEach((done) => {
      dismantle(app, server, done)
    })

    it('GET /Customer 200 - filtered name and age', (done) => {
      request.get(
        {
          url: `${testUrl}/api/v1/Customer`,
          json: true,
        },
        (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          assert.equal(body.length, 1)
          assert.equal(body[0].name, 'John')
          assert.equal(body[0].age, 24)
          done()
        }
      )
    })

    it('GET /Customer/:id 404 - filtered name', (done) => {
      request.get(
        {
          url: `${testUrl}/api/v1/Customer/${customers[0]._id}`,
          json: true,
        },
        (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 404)
          done()
        }
      )
    })

    it('GET /Customer/:id/shallow 404 - filtered age', (done) => {
      request.get(
        {
          url: `${testUrl}/api/v1/Customer/${customers[2]._id}/shallow`,
          json: true,
        },
        (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 404)
          done()
        }
      )
    })

    it('GET /Customer/count 200 - filtered name and age', (done) => {
      request.get(
        {
          url: `${testUrl}/api/v1/Customer/count`,
          json: true,
        },
        (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          assert.equal(body.count, 1)
          done()
        }
      )
    })

    updateMethods.forEach((method) => {
      it(`${method} /Customer/:id 200`, (done) => {
        request(
          {
            method,
            url: `${testUrl}/api/v1/Customer/${customers[1]._id}`,
            json: {
              name: 'Johnny',
            },
          },
          (err, res, body) => {
            assert.ok(!err)
            assert.equal(res.statusCode, 200)
            assert.equal(body.name, 'Johnny')
            done()
          }
        )
      })

      it(`${method} /Customer/:id 404 - filtered name`, (done) => {
        request(
          {
            method,
            url: `${testUrl}/api/v1/Customer/${customers[0]._id}`,
            json: {
              name: 'Bobby',
            },
          },
          (err, res, body) => {
            assert.ok(!err)
            assert.equal(res.statusCode, 404)

            db.models.Customer.findById(customers[0]._id, (err, customer) => {
              assert.ok(!err)
              assert.notEqual(customer.name, 'Bobby')
              done()
            })
          }
        )
      })
    })

    it('DELETE /Customer/:id 200', (done) => {
      request.del(
        {
          url: `${testUrl}/api/v1/Customer/${customers[1]._id}`,
          json: true,
        },
        (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 204)

          db.models.Customer.findById(customers[1]._id, (err, customer) => {
            assert.ok(!err)
            assert.ok(!customer)
            done()
          })
        }
      )
    })

    it('DELETE /Customer/:id 404 - filtered age', (done) => {
      request.del(
        {
          url: `${testUrl}/api/v1/Customer/${customers[2]._id}`,
          json: true,
        },
        (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 404)

          db.models.Customer.findById(customers[2]._id, (err, customer) => {
            assert.ok(!err)
            assert.ok(customer)
            assert.equal(customer.name, 'Mike')
            done()
          })
        }
      )
    })

    it('DELETE /Customer 200 - filtered name and age', (done) => {
      request.del(
        {
          url: `${testUrl}/api/v1/Customer`,
          json: true,
        },
        (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 204)

          db.models.Customer.countDocuments((err, count) => {
            assert.ok(!err)
            assert.equal(count, 2)
            done()
          })
        }
      )
    })
  })
}
