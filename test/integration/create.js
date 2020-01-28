'use strict'

const assert = require('assert')
const mongoose = require('mongoose')
const request = require('request')

module.exports = function(createFn, setup, dismantle) {
  const erm = require('../../src/express-restify-mongoose')
  const db = require('./setup')()

  let testPort = 30023
  let testUrl = `http://localhost:${testPort}`
  let invalidId = 'invalid-id'
  let randomId = mongoose.Types.ObjectId().toHexString()

  describe('Create documents', () => {
    let app = createFn()
    let server
    let customer, product

    beforeEach(done => {
      setup(err => {
        if (err) {
          return done(err)
        }

        erm.serve(app, db.models.Customer, {
          restify: app.isRestify
        })

        erm.serve(app, db.models.Invoice, {
          restify: app.isRestify
        })

        erm.serve(app, db.models.Product, {
          restify: app.isRestify
        })

        db.models.Customer.create({
          name: 'Bob'
        })
          .then(createdCustomer => {
            customer = createdCustomer

            return db.models.Product.create({
              name: 'Bobsleigh'
            })
          })
          .then(createdProduct => {
            product = createdProduct
            server = app.listen(testPort, done)
          })
          .catch(done)
      })
    })

    afterEach(done => {
      dismantle(app, server, done)
    })

    it('POST /Customer 201', done => {
      request.post(
        {
          url: `${testUrl}/api/v1/Customer`,
          json: {
            name: 'John'
          }
        },
        (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 201)
          assert.ok(body._id)
          assert.equal(body.name, 'John')
          done()
        }
      )
    })

    it('POST /Customer 201 - generate _id (undefined)', done => {
      request.post(
        {
          url: `${testUrl}/api/v1/Customer`,
          json: {
            _id: undefined,
            name: 'John'
          }
        },
        (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 201)
          assert.ok(body._id)
          assert.equal(body.name, 'John')
          done()
        }
      )
    })

    it('POST /Customer 201 - generate _id (null)', done => {
      request.post(
        {
          url: `${testUrl}/api/v1/Customer`,
          json: {
            _id: null,
            name: 'John'
          }
        },
        (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 201)
          assert.ok(body._id)
          assert.equal(body.name, 'John')
          done()
        }
      )
    })

    it('POST /Customer 201 - use provided _id', done => {
      request.post(
        {
          url: `${testUrl}/api/v1/Customer`,
          json: {
            _id: randomId,
            name: 'John'
          }
        },
        (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 201)
          assert.ok(body._id)
          assert.ok(body._id === randomId)
          assert.equal(body.name, 'John')
          done()
        }
      )
    })

    it('POST /Customer 201 - ignore __v', done => {
      request.post(
        {
          url: `${testUrl}/api/v1/Customer`,
          json: {
            __v: '1',
            name: 'John'
          }
        },
        (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 201)
          assert.ok(body._id)
          assert.ok(body.__v === 0)
          assert.equal(body.name, 'John')
          done()
        }
      )
    })

    it('POST /Customer 201 - array', done => {
      request.post(
        {
          url: `${testUrl}/api/v1/Customer`,
          json: [
            {
              name: 'John'
            },
            {
              name: 'Mike'
            }
          ]
        },
        (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 201)
          assert.ok(Array.isArray(body))
          assert.ok(body.length, 2)
          assert.ok(body[0]._id)
          assert.equal(body[0].name, 'John')
          assert.ok(body[1]._id)
          assert.equal(body[1].name, 'Mike')
          done()
        }
      )
    })

    it('POST /Customer 400 - validation error', done => {
      request.post(
        {
          url: `${testUrl}/api/v1/Customer`,
          json: {}
        },
        (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 400)
          assert.equal(body.name, 'ValidationError')
          assert.deepEqual(body, {
            name: 'ValidationError',
            message: 'Customer validation failed: name: Path `name` is required.',
            _message: 'Customer validation failed',
            errors: {
              name: {
                kind: 'required',
                message: 'Path `name` is required.',
                name: 'ValidatorError',
                path: 'name',
                properties: {
                  message: 'Path `name` is required.',
                  path: 'name',
                  type: 'required'
                }
              }
            }
          })
          done()
        }
      )
    })

    it('POST /Customer 400 - missing content type', done => {
      request.post(
        {
          url: `${testUrl}/api/v1/Customer`
        },
        (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 400)
          assert.deepEqual(JSON.parse(body), {
            name: 'Error',
            message: 'missing_content_type'
          })
          done()
        }
      )
    })

    it('POST /Customer 400 - invalid content type', done => {
      request.post(
        {
          url: `${testUrl}/api/v1/Customer`,
          formData: {}
        },
        (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 400)
          assert.deepEqual(JSON.parse(body), {
            name: 'Error',
            message: 'invalid_content_type'
          })
          done()
        }
      )
    })

    it('POST /Invoice 201 - referencing customer and product ids as strings', done => {
      request.post(
        {
          url: `${testUrl}/api/v1/Invoice`,
          json: {
            customer: customer._id.toHexString(),
            products: product._id.toHexString(),
            amount: 42
          }
        },
        (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 201)
          assert.ok(body._id)
          assert.equal(body.customer, customer._id)
          assert.equal(body.amount, 42)
          done()
        }
      )
    })

    it('POST /Invoice 201 - referencing customer and products ids as strings', done => {
      request.post(
        {
          url: `${testUrl}/api/v1/Invoice`,
          json: {
            customer: customer._id.toHexString(),
            products: [product._id.toHexString(), product._id.toHexString()],
            amount: 42
          }
        },
        (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 201)
          assert.ok(body._id)
          assert.equal(body.customer, customer._id)
          assert.equal(body.amount, 42)
          done()
        }
      )
    })

    it('POST /Invoice 201 - referencing customer and product ids', done => {
      request.post(
        {
          url: `${testUrl}/api/v1/Invoice`,
          json: {
            customer: customer._id,
            products: product._id,
            amount: 42
          }
        },
        (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 201)
          assert.ok(body._id)
          assert.equal(body.customer, customer._id)
          assert.equal(body.amount, 42)
          done()
        }
      )
    })

    it('POST /Invoice 201 - referencing customer and products ids', done => {
      request.post(
        {
          url: `${testUrl}/api/v1/Invoice`,
          json: {
            customer: customer._id,
            products: [product._id, product._id],
            amount: 42
          }
        },
        (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 201)
          assert.ok(body._id)
          assert.equal(body.customer, customer._id)
          assert.equal(body.amount, 42)
          done()
        }
      )
    })

    it('POST /Invoice 201 - referencing customer and product', done => {
      request.post(
        {
          url: `${testUrl}/api/v1/Invoice`,
          json: {
            customer: customer,
            products: product,
            amount: 42
          }
        },
        (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 201)
          assert.ok(body._id)
          assert.equal(body.customer, customer._id)
          assert.equal(body.amount, 42)
          done()
        }
      )
    })

    it('POST /Invoice 201 - referencing customer and products', done => {
      request.post(
        {
          url: `${testUrl}/api/v1/Invoice`,
          json: {
            customer: customer,
            products: [product, product],
            amount: 42
          }
        },
        (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 201)
          assert.ok(body._id)
          assert.equal(body.customer, customer._id)
          assert.equal(body.amount, 42)
          done()
        }
      )
    })

    it('POST /Invoice?populate=customer,products 201 - referencing customer and products', done => {
      request.post(
        {
          url: `${testUrl}/api/v1/Invoice`,
          qs: {
            populate: 'customer,products'
          },
          json: {
            customer: customer,
            products: [product, product],
            amount: 42
          }
        },
        (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 201)
          assert.ok(body._id)
          assert.equal(body.amount, 42)
          assert.equal(body.customer._id, customer._id)
          assert.equal(body.customer.name, customer.name)
          assert.equal(body.products[0]._id, product._id.toHexString())
          assert.equal(body.products[0].name, product.name)
          assert.equal(body.products[1]._id, product._id.toHexString())
          assert.equal(body.products[1].name, product.name)
          done()
        }
      )
    })

    it('POST /Invoice 400 - referencing invalid customer and products ids', done => {
      request.post(
        {
          url: `${testUrl}/api/v1/Invoice`,
          json: {
            customer: invalidId,
            products: [invalidId, invalidId],
            amount: 42
          }
        },
        (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 400)
          delete body.message
          assert.deepEqual(body, {
            name: 'ValidationError',
            _message: 'Invoice validation failed',
            errors: {
              customer: {
                kind: 'ObjectID',
                message: 'Cast to ObjectID failed for value "invalid-id" at path "customer"',
                name: 'CastError',
                path: 'customer',
                stringValue: '"invalid-id"',
                value: 'invalid-id'
              },
              products: {
                kind: 'Array',
                message: 'Cast to Array failed for value "[ \'invalid-id\', \'invalid-id\' ]" at path "products"',
                name: 'CastError',
                path: 'products',
                stringValue: "\"[ 'invalid-id', 'invalid-id' ]\"",
                value: ['invalid-id', 'invalid-id']
              }
            }
          })
          done()
        }
      )
    })
  })
}
