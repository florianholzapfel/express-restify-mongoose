'use strict'

const assert = require('assert')
const mongoose = require('mongoose')
const request = require('request')

module.exports = function (createFn, setup, dismantle) {
  const erm = require('../../src/express-restify-mongoose')
  const db = require('./setup')()

  const testPort = 30023
  const testUrl = `http://localhost:${testPort}`
  const invalidId = 'invalid-id'
  const randomId = mongoose.Types.ObjectId().toHexString()
  const updateMethods = ['PATCH', 'POST', 'PUT']

  describe('Update documents', () => {
    describe('findOneAndUpdate: true', () => {
      let app = createFn()
      let server
      let customers
      let products
      let invoice

      beforeEach((done) => {
        setup((err) => {
          if (err) {
            return done(err)
          }

          erm.serve(app, db.models.Customer, {
            findOneAndUpdate: true,
            restify: app.isRestify,
          })

          erm.serve(app, db.models.Invoice, {
            findOneAndUpdate: true,
            restify: app.isRestify,
          })

          db.models.Customer.create([
            {
              name: 'Bob',
            },
            {
              name: 'John',
            },
          ])
            .then((createdCustomers) => {
              customers = createdCustomers

              return db.models.Product.create([
                {
                  name: 'Bobsleigh',
                },
                {
                  name: 'Jacket',
                },
              ])
            })
            .then((createdProducts) => {
              products = createdProducts

              return db.models.Invoice.create({
                customer: customers[0]._id,
                products: createdProducts,
                amount: 100,
              })
            })
            .then((createdInvoice) => {
              invoice = createdInvoice

              return db.models.Customer.create({
                name: 'Jane',
                purchases: [
                  {
                    item: products[0]._id,
                    number: 1,
                  },
                  {
                    item: products[1]._id,
                    number: 3,
                  },
                ],
                returns: [products[0]._id, products[1]._id],
              })
            })
            .then((customer) => {
              customers.push(customer)
              server = app.listen(testPort, done)
            })
            .catch(done)
        })
      })

      afterEach((done) => {
        dismantle(app, server, done)
      })

      updateMethods.forEach((method) => {
        it(`${method} /Customer/:id 200 - empty body`, (done) => {
          request(
            {
              method,
              url: `${testUrl}/api/v1/Customer/${customers[0]._id}`,
              json: {},
            },
            (err, res, body) => {
              assert.ok(!err)
              assert.equal(res.statusCode, 200)
              assert.equal(body.name, 'Bob')
              done()
            }
          )
        })

        it(`${method} /Customer/:id 200 - created id`, (done) => {
          request(
            {
              method,
              url: `${testUrl}/api/v1/Customer/${customers[0]._id}`,
              json: {
                name: 'Mike',
              },
            },
            (err, res, body) => {
              assert.ok(!err)
              assert.equal(res.statusCode, 200)
              assert.equal(body.name, 'Mike')
              done()
            }
          )
        })

        it(`${method} /Customer/:id 400 - cast error`, (done) => {
          request(
            {
              method,
              url: `${testUrl}/api/v1/Customer/${customers[0]._id}`,
              json: {
                age: 'not a number',
              },
            },
            (err, res, body) => {
              assert.ok(!err)
              assert.equal(res.statusCode, 400)
              delete body.reason
              assert.deepEqual(body, {
                kind: 'Number',
                message: 'Cast to Number failed for value "not a number" at path "age"',
                name: 'CastError',
                path: 'age',
                stringValue: '"not a number"',
                value: 'not a number',
              })
              done()
            }
          )
        })

        it(`${method} /Customer/:id 400 - mongo error`, (done) => {
          request(
            {
              method,
              url: `${testUrl}/api/v1/Customer/${customers[0]._id}`,
              json: {
                name: 'John',
              },
            },
            (err, res, body) => {
              assert.ok(!err)
              assert.equal(res.statusCode, 400)
              assert.ok(Object.keys(body).length === 5 || Object.keys(body).length === 6 || Object.keys(body).length === 8)
              assert.equal(body.name, 'MongoError')
              // Remove extra whitespace and allow code 11001 for MongoDB < 3
              assert.ok(
                body.errmsg
                  .replace(/\s+/g, ' ')
                  .replace('exception: ', '')
                  .match(/E11000 duplicate key error (?:index|collection): database.customers(\.\$| index: )name_1 dup key: { (?:name|): "John" }/) !== null
              )
              assert.ok(
                body.message
                  .replace(/\s+/g, ' ')
                  .replace('exception: ', '')
                  .match(/E11000 duplicate key error (?:index|collection): database.customers(?:\.\$| index: )name_1 dup key: { (?:name|): "John" }/) !== null
              )
              assert.ok(body.code === 11000 || body.code === 11001)
              assert.ok(!body.codeName || body.codeName === 'DuplicateKey') // codeName is optional
              assert.equal(body.ok, 0)
              done()
            }
          )
        })

        it(`${method} /Customer/:id 400 - missing content type`, (done) => {
          request(
            {
              method,
              url: `${testUrl}/api/v1/Customer/${customers[0]._id}`,
            },
            (err, res, body) => {
              assert.ok(!err)
              assert.equal(res.statusCode, 400)
              assert.deepEqual(JSON.parse(body), {
                name: 'Error',
                message: 'missing_content_type',
              })
              done()
            }
          )
        })

        it(`${method} /Customer/:id 400 - invalid content type`, (done) => {
          request(
            {
              method,
              url: `${testUrl}/api/v1/Customer/${customers[0]._id}`,
              formData: {},
            },
            (err, res, body) => {
              assert.ok(!err)
              assert.equal(res.statusCode, 400)
              assert.deepEqual(JSON.parse(body), {
                name: 'Error',
                message: 'invalid_content_type',
              })
              done()
            }
          )
        })

        it(`${method} /Customer/:id 404 - invalid id`, (done) => {
          request(
            {
              method,
              url: `${testUrl}/api/v1/Customer/${invalidId}`,
              json: {
                name: 'Mike',
              },
            },
            (err, res, body) => {
              assert.ok(!err)
              assert.equal(res.statusCode, 404)
              done()
            }
          )
        })

        it(`${method} /Customer/:id 404 - random id`, (done) => {
          request(
            {
              method,
              url: `${testUrl}/api/v1/Customer/${randomId}`,
              json: {
                name: 'Mike',
              },
            },
            (err, res, body) => {
              assert.ok(!err)
              assert.equal(res.statusCode, 404)
              done()
            }
          )
        })

        it(`${method} /Invoice/:id 200 - referencing customer and product ids as strings`, (done) => {
          request(
            {
              method,
              url: `${testUrl}/api/v1/Invoice/${invoice._id}`,
              json: {
                customer: customers[1]._id.toHexString(),
                products: products[1]._id.toHexString(),
              },
            },
            (err, res, body) => {
              assert.ok(!err)
              assert.equal(res.statusCode, 200)
              assert.equal(body.customer, customers[1]._id)
              assert.equal(body.products[0], products[1]._id)
              done()
            }
          )
        })

        it(`${method} /Invoice/:id 200 - referencing customer and products ids as strings`, (done) => {
          request(
            {
              method,
              url: `${testUrl}/api/v1/Invoice/${invoice._id}`,
              json: {
                customer: customers[1]._id.toHexString(),
                products: [products[1]._id.toHexString()],
              },
            },
            (err, res, body) => {
              assert.ok(!err)
              assert.equal(res.statusCode, 200)
              assert.equal(body.customer, customers[1]._id)
              assert.equal(body.products[0], products[1]._id)
              done()
            }
          )
        })

        it(`${method} /Invoice/:id 200 - referencing customer and product ids`, (done) => {
          request(
            {
              method,
              url: `${testUrl}/api/v1/Invoice/${invoice._id}`,
              json: {
                customer: customers[1]._id,
                products: products[1]._id,
              },
            },
            (err, res, body) => {
              assert.ok(!err)
              assert.equal(res.statusCode, 200)
              assert.equal(body.customer, customers[1]._id)
              assert.equal(body.products[0], products[1]._id)
              done()
            }
          )
        })

        it(`${method} /Invoice/:id 200 - referencing customer and products ids`, (done) => {
          request(
            {
              method,
              url: `${testUrl}/api/v1/Invoice/${invoice._id}`,
              json: {
                customer: customers[1]._id,
                products: [products[1]._id],
              },
            },
            (err, res, body) => {
              assert.ok(!err)
              assert.equal(res.statusCode, 200)
              assert.equal(body.customer, customers[1]._id)
              assert.equal(body.products[0], products[1]._id)
              done()
            }
          )
        })

        describe('populated subdocument', () => {
          it(`${method} /Invoice/:id 200 - update with populated customer`, (done) => {
            db.models.Invoice.findById(invoice._id)
              .populate('customer')
              .exec()
              .then((invoice) => {
                assert.notEqual(invoice.amount, 200)
                invoice.amount = 200

                request(
                  {
                    method,
                    url: `${testUrl}/api/v1/Invoice/${invoice._id}`,
                    json: invoice,
                  },
                  (err, res, body) => {
                    assert.ok(!err)
                    assert.equal(res.statusCode, 200)
                    assert.equal(body.amount, 200)
                    assert.equal(body.customer, invoice.customer._id)
                    done()
                  }
                )
              })
              .catch(done)
          })

          it(`${method} /Invoice/:id 200 - update with populated products`, (done) => {
            db.models.Invoice.findById(invoice._id)
              .populate('products')
              .exec()
              .then((invoice) => {
                assert.notEqual(invoice.amount, 200)
                invoice.amount = 200

                request(
                  {
                    method,
                    url: `${testUrl}/api/v1/Invoice/${invoice._id}`,
                    json: invoice,
                  },
                  (err, res, body) => {
                    assert.ok(!err)
                    assert.equal(res.statusCode, 200)
                    assert.equal(body.amount, 200)
                    assert.deepEqual(body.products, [invoice.products[0]._id.toHexString(), invoice.products[1]._id.toHexString()])
                    done()
                  }
                )
              })
              .catch(done)
          })

          it(`${method} /Invoice/:id?populate=customer,products 200 - update with populated customer`, (done) => {
            db.models.Invoice.findById(invoice._id)
              .populate('customer products')
              .exec()
              .then((invoice) => {
                request(
                  {
                    method,
                    url: `${testUrl}/api/v1/Invoice/${invoice._id}`,
                    qs: {
                      populate: 'customer,products',
                    },
                    json: invoice,
                  },
                  (err, res, body) => {
                    assert.ok(!err)
                    assert.equal(res.statusCode, 200)
                    assert.ok(body.customer)
                    assert.equal(body.customer._id, invoice.customer._id)
                    assert.equal(body.customer.name, invoice.customer.name)
                    assert.ok(body.products)
                    assert.equal(body.products[0]._id, invoice.products[0]._id.toHexString())
                    assert.equal(body.products[0].name, invoice.products[0].name)
                    assert.equal(body.products[1]._id, invoice.products[1]._id.toHexString())
                    assert.equal(body.products[1].name, invoice.products[1].name)
                    done()
                  }
                )
              })
              .catch(done)
          })

          it(`${method} /Customer/:id 200 - update with reduced count of populated returns`, (done) => {
            db.models.Customer.findOne({ name: 'Jane' })
              .populate('purchases returns')
              .exec()
              .then((customer) => {
                customer.returns = [customer.returns[1]]
                request(
                  {
                    method,
                    url: `${testUrl}/api/v1/Customer/${customer._id}`,
                    qs: {
                      populate: 'returns,purchases.item',
                    },
                    json: customer,
                  },
                  (err, res, body) => {
                    assert.ok(!err)
                    assert.equal(res.statusCode, 200)
                    assert.ok(body.returns)
                    assert.equal(body.returns.length, 1)
                    assert.equal(body.returns[0]._id, products[1]._id)
                    done()
                  }
                )
              })
              .catch(done)
          })
        })
      })

      it('PATCH /Customer 404 (Express), 405 (Restify)', (done) => {
        request.patch(
          {
            url: `${testUrl}/api/v1/Customer`,
            json: {},
          },
          (err, res, body) => {
            assert.ok(!err)
            if (app.isRestify) {
              assert.equal(res.statusCode, 405)
            } else {
              assert.equal(res.statusCode, 404)
            }
            done()
          }
        )
      })

      it('PUT /Customer 404 (Express), 405 (Restify)', (done) => {
        request.put(
          {
            url: `${testUrl}/api/v1/Customer`,
            json: {},
          },
          (err, res, body) => {
            assert.ok(!err)
            if (app.isRestify) {
              assert.equal(res.statusCode, 405)
            } else {
              assert.equal(res.statusCode, 404)
            }
            done()
          }
        )
      })
    })

    describe('findOneAndUpdate: false', () => {
      let app = createFn()
      let server
      let customers
      let products
      let invoice

      beforeEach((done) => {
        setup((err) => {
          if (err) {
            return done(err)
          }

          erm.serve(app, db.models.Customer, {
            findOneAndUpdate: false,
            restify: app.isRestify,
          })

          erm.serve(app, db.models.Invoice, {
            findOneAndUpdate: false,
            restify: app.isRestify,
          })

          db.models.Customer.create([
            {
              name: 'Bob',
            },
            {
              name: 'John',
            },
          ])
            .then((createdCustomers) => {
              customers = createdCustomers

              return db.models.Product.create([
                {
                  name: 'Bobsleigh',
                },
                {
                  name: 'Jacket',
                },
              ])
            })
            .then((createdProducts) => {
              products = createdProducts

              return db.models.Invoice.create({
                customer: customers[0]._id,
                products: createdProducts,
                amount: 100,
              })
            })
            .then((createdInvoice) => {
              invoice = createdInvoice

              return db.models.Customer.create({
                name: 'Jane',
                purchases: [
                  {
                    item: products[0]._id,
                    number: 1,
                  },
                  {
                    item: products[1]._id,
                    number: 3,
                  },
                ],
                returns: [products[0]._id, products[1]._id],
              })
            })
            .then((customer) => {
              customers.push(customer)
              server = app.listen(testPort, done)
            })
            .catch(done)
        })
      })

      afterEach((done) => {
        dismantle(app, server, done)
      })

      updateMethods.forEach((method) => {
        it(`${method} /Customer/:id 200 - empty body`, (done) => {
          request(
            {
              method,
              url: `${testUrl}/api/v1/Customer/${customers[0]._id}`,
              json: {},
            },
            (err, res, body) => {
              assert.ok(!err)
              assert.equal(res.statusCode, 200)
              assert.equal(body.name, 'Bob')
              done()
            }
          )
        })

        it(`${method} /Customer/:id 200 - created id`, (done) => {
          request(
            {
              method,
              url: `${testUrl}/api/v1/Customer/${customers[0]._id}`,
              json: {
                name: 'Mike',
              },
            },
            (err, res, body) => {
              assert.ok(!err)
              assert.equal(res.statusCode, 200)
              assert.equal(body.name, 'Mike')
              done()
            }
          )
        })

        it(`${method} /Customer/:id 400 - validation error`, (done) => {
          request(
            {
              method,
              url: `${testUrl}/api/v1/Customer/${customers[0]._id}`,
              json: {
                age: 'not a number',
              },
            },
            (err, res, body) => {
              assert.ok(!err)
              assert.equal(res.statusCode, 400)
              assert.deepEqual(body, {
                name: 'ValidationError',
                _message: 'Customer validation failed',
                message: 'Customer validation failed: age: Cast to Number failed for value "not a number" at path "age"',
                errors: {
                  age: {
                    kind: 'Number',
                    message: 'Cast to Number failed for value "not a number" at path "age"',
                    name: 'CastError',
                    path: 'age',
                    stringValue: '"not a number"',
                    value: 'not a number',
                  },
                },
              })
              done()
            }
          )
        })

        it(`${method} /Customer/:id 400 - mongo error`, (done) => {
          request(
            {
              method,
              url: `${testUrl}/api/v1/Customer/${customers[0]._id}`,
              json: {
                name: 'John',
              },
            },
            (err, res, body) => {
              assert.ok(!err)
              assert.equal(res.statusCode, 400)
              // Remove extra whitespace, allow 6, 8, or 9 keys and code 11001 for MongoDB < 3
              assert.ok(Object.keys(body).length === 6 || Object.keys(body).length === 8 || Object.keys(body).length === 9)
              assert.equal(body.name, 'MongoError')
              assert.equal(body.driver, true)
              assert.ok(
                body.errmsg
                  .replace(/\s+/g, ' ')
                  .replace('exception: ', '')
                  .match(/E11000 duplicate key error (?:index|collection): database.customers(?:\.\$| index: )name_1 dup key: { (?:name|): "John" }/) !== null
              )
              assert.ok(
                body.message
                  .replace(/\s+/g, ' ')
                  .replace('exception: ', '')
                  .match(/E11000 duplicate key error (?:index|collection): database.customers(?:\.\$| index: )name_1 dup key: { (?:name|): "John" }/) !== null
              )
              assert.ok(body.code === 11000 || body.code === 11001)
              assert.ok(!body.writeErrors || body.writeErrors.length === 1)
              done()
            }
          )
        })

        it(`${method} /Customer/:id 400 - missing content type`, (done) => {
          request(
            {
              method,
              url: `${testUrl}/api/v1/Customer/${customers[0]._id}`,
            },
            (err, res, body) => {
              assert.ok(!err)
              assert.equal(res.statusCode, 400)
              assert.deepEqual(JSON.parse(body), {
                name: 'Error',
                message: 'missing_content_type',
              })
              done()
            }
          )
        })

        it(`${method} /Customer/:id 400 - invalid content type`, (done) => {
          request(
            {
              method,
              url: `${testUrl}/api/v1/Customer/${customers[0]._id}`,
              formData: {
                name: 'Mike',
              },
            },
            (err, res, body) => {
              assert.ok(!err)
              assert.equal(res.statusCode, 400)
              assert.deepEqual(JSON.parse(body), {
                name: 'Error',
                message: 'invalid_content_type',
              })
              done()
            }
          )
        })

        it(`${method} /Customer/:id 404 - invalid id`, (done) => {
          request(
            {
              method,
              url: `${testUrl}/api/v1/Customer/${invalidId}`,
              json: {
                name: 'Mike',
              },
            },
            (err, res, body) => {
              assert.ok(!err)
              assert.equal(res.statusCode, 404)
              done()
            }
          )
        })

        it(`${method} /Customer/:id 404 - random id`, (done) => {
          request(
            {
              method,
              url: `${testUrl}/api/v1/Customer/${randomId}`,
              json: {
                name: 'Mike',
              },
            },
            (err, res, body) => {
              assert.ok(!err)
              assert.equal(res.statusCode, 404)
              done()
            }
          )
        })

        it(`${method} /Invoice/:id 200 - referencing customer and product ids as strings`, (done) => {
          request(
            {
              method,
              url: `${testUrl}/api/v1/Invoice/${invoice._id}`,
              json: {
                customer: customers[1]._id.toHexString(),
                products: products[1]._id.toHexString(),
              },
            },
            (err, res, body) => {
              assert.ok(!err)
              assert.equal(res.statusCode, 200)
              assert.equal(body.customer, customers[1]._id)
              assert.equal(body.products[0], products[1]._id)
              done()
            }
          )
        })

        it(`${method} /Invoice/:id 200 - referencing customer and products ids as strings`, (done) => {
          request(
            {
              method,
              url: `${testUrl}/api/v1/Invoice/${invoice._id}`,
              json: {
                customer: customers[1]._id.toHexString(),
                products: [products[1]._id.toHexString()],
              },
            },
            (err, res, body) => {
              assert.ok(!err)
              assert.equal(res.statusCode, 200)
              assert.equal(body.customer, customers[1]._id)
              assert.equal(body.products[0], products[1]._id)
              done()
            }
          )
        })

        it(`${method} /Invoice/:id 200 - referencing customer and product ids`, (done) => {
          request(
            {
              method,
              url: `${testUrl}/api/v1/Invoice/${invoice._id}`,
              json: {
                customer: customers[1]._id,
                products: products[1]._id,
              },
            },
            (err, res, body) => {
              assert.ok(!err)
              assert.equal(res.statusCode, 200)
              assert.equal(body.customer, customers[1]._id)
              assert.equal(body.products[0], products[1]._id)
              done()
            }
          )
        })

        it(`${method} /Invoice/:id 200 - referencing customer and products ids`, (done) => {
          request(
            {
              method,
              url: `${testUrl}/api/v1/Invoice/${invoice._id}`,
              json: {
                customer: customers[1]._id,
                products: [products[1]._id],
              },
            },
            (err, res, body) => {
              assert.ok(!err)
              assert.equal(res.statusCode, 200)
              assert.equal(body.customer, customers[1]._id)
              assert.equal(body.products[0], products[1]._id)
              done()
            }
          )
        })

        describe('populated subdocument', () => {
          it(`${method} /Invoice/:id 200 - update with populated customer`, (done) => {
            db.models.Invoice.findById(invoice._id)
              .populate('customer')
              .exec()
              .then((invoice) => {
                assert.notEqual(invoice.amount, 200)
                invoice.amount = 200

                request(
                  {
                    method,
                    url: `${testUrl}/api/v1/Invoice/${invoice._id}`,
                    json: invoice,
                  },
                  (err, res, body) => {
                    assert.ok(!err)
                    assert.equal(res.statusCode, 200)
                    assert.equal(body.amount, 200)
                    assert.equal(body.customer, invoice.customer._id)
                    done()
                  }
                )
              })
              .catch(done)
          })

          it(`${method} /Invoice/:id 200 - update with populated products`, (done) => {
            db.models.Invoice.findById(invoice._id)
              .populate('products')
              .exec()
              .then((invoice) => {
                assert.notEqual(invoice.amount, 200)
                invoice.amount = 200

                request(
                  {
                    method,
                    url: `${testUrl}/api/v1/Invoice/${invoice._id}`,
                    json: invoice,
                  },
                  (err, res, body) => {
                    assert.ok(!err)
                    assert.equal(res.statusCode, 200)
                    assert.equal(body.amount, 200)
                    assert.deepEqual(body.products, [invoice.products[0]._id.toHexString(), invoice.products[1]._id.toHexString()])
                    done()
                  }
                )
              })
              .catch(done)
          })

          it(`${method} /Invoice/:id?populate=customer,products 200 - update with populated customer`, (done) => {
            db.models.Invoice.findById(invoice._id)
              .populate('customer products')
              .exec()
              .then((invoice) => {
                request(
                  {
                    method,
                    url: `${testUrl}/api/v1/Invoice/${invoice._id}`,
                    qs: {
                      populate: 'customer,products',
                    },
                    json: invoice,
                  },
                  (err, res, body) => {
                    assert.ok(!err)
                    assert.equal(res.statusCode, 200)
                    assert.ok(body.customer)
                    assert.equal(body.customer._id, invoice.customer._id)
                    assert.equal(body.customer.name, invoice.customer.name)
                    assert.ok(body.products)
                    assert.equal(body.products[0]._id, invoice.products[0]._id.toHexString())
                    assert.equal(body.products[0].name, invoice.products[0].name)
                    assert.equal(body.products[1]._id, invoice.products[1]._id.toHexString())
                    assert.equal(body.products[1].name, invoice.products[1].name)
                    done()
                  }
                )
              })
              .catch(done)
          })

          it(`${method} /Customer/:id 200 - update with reduced count of populated returns`, (done) => {
            db.models.Customer.findOne({ name: 'Jane' })
              .populate('purchases returns')
              .exec()
              .then((customer) => {
                customer.returns = [customer.returns[1]]
                request(
                  {
                    method,
                    url: `${testUrl}/api/v1/Customer/${customer._id}`,
                    qs: {
                      populate: 'returns,purchases.item',
                    },
                    json: customer,
                  },
                  (err, res, body) => {
                    assert.ok(!err)
                    assert.equal(res.statusCode, 200)
                    assert.ok(body.returns)
                    assert.equal(body.returns.length, 1)
                    assert.equal(body.returns[0]._id, products[1]._id)
                    done()
                  }
                )
              })
              .catch(done)
          })
        })
      })

      it('PATCH /Customer 404 (Express), 405 (Restify)', (done) => {
        request.patch(
          {
            url: `${testUrl}/api/v1/Customer`,
            json: {},
          },
          (err, res, body) => {
            assert.ok(!err)
            if (app.isRestify) {
              assert.equal(res.statusCode, 405)
            } else {
              assert.equal(res.statusCode, 404)
            }
            done()
          }
        )
      })

      it('PUT /Customer 404 (Express), 405 (Restify)', (done) => {
        request.put(
          {
            url: `${testUrl}/api/v1/Customer`,
            json: {},
          },
          (err, res, body) => {
            assert.ok(!err)
            if (app.isRestify) {
              assert.equal(res.statusCode, 405)
            } else {
              assert.equal(res.statusCode, 404)
            }
            done()
          }
        )
      })
    })
  })
}
