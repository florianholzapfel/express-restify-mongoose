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

  describe('Read documents', () => {
    let app = createFn()
    let server
    let customers

    beforeEach((done) => {
      setup((err) => {
        if (err) {
          return done(err)
        }

        erm.serve(app, db.models.Customer, {
          restify: app.isRestify
        })

        erm.serve(app, db.models.Invoice, {
          restify: app.isRestify
        })

        db.models.Product.create({
          name: 'Bobsleigh'
        }).then((createdProduct) => {
          return db.models.Customer.create([{
            name: 'Bob',
            age: 12,
            favorites: {
              animal: 'Boar',
              color: 'Black',
              purchase: {
                item: createdProduct._id,
                number: 1
              }
            },
            coordinates: [45.2667, 72.1500]
          }, {
            name: 'John',
            age: 24,
            favorites: {
              animal: 'Jaguar',
              color: 'Jade',
              purchase: {
                item: createdProduct._id,
                number: 2
              }
            }
          }, {
            name: 'Mike',
            age: 36,
            favorites: {
              animal: 'Medusa',
              color: 'Maroon',
              purchase: {
                item: createdProduct._id,
                number: 3
              }
            }
          }])
        }).then((createdCustomers) => {
          customers = createdCustomers

          return db.models.Invoice.create([{
            customer: customers[0]._id,
            amount: 100,
            receipt: 'A'
          }, {
            customer: customers[1]._id,
            amount: 200,
            receipt: 'B'
          }, {
            customer: customers[2]._id,
            amount: 300,
            receipt: 'C'
          }])
        }).then((createdInvoices) => {
          server = app.listen(testPort, done)
        }).catch(done)
      })
    })

    afterEach((done) => {
      dismantle(app, server, done)
    })

    it('GET /Customer 200', (done) => {
      request.get({
        url: `${testUrl}/api/v1/Customer`,
        json: true
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        assert.equal(body.length, 3)
        done()
      })
    })

    it('GET /Customer/:id 200 - created id', (done) => {
      request.get({
        url: `${testUrl}/api/v1/Customer/${customers[0]._id}`,
        json: true
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        assert.equal(body.name, 'Bob')
        done()
      })
    })

    it('GET /Customer/:id 404 - invalid id', (done) => {
      request.get({
        url: `${testUrl}/api/v1/Customer/${invalidId}`,
        json: true
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 404)
        done()
      })
    })

    it('GET /Customer/:id 404 - random id', (done) => {
      request.get({
        url: `${testUrl}/api/v1/Customer/${randomId}`,
        json: true
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 404)
        done()
      })
    })

    describe('ignore unknown parameters', () => {
      it('GET /Customer?foo=bar 200', (done) => {
        request.get({
          url: `${testUrl}/api/v1/Customer`,
          qs: {
            foo: 'bar'
          },
          json: true
        }, (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          assert.equal(body.length, 3)
          done()
        })
      })
    })

    describe('limit', () => {
      it('GET /Customer?limit=1 200', (done) => {
        request.get({
          url: `${testUrl}/api/v1/Customer`,
          qs: {
            limit: 1
          },
          json: true
        }, (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          assert.equal(body.length, 1)
          done()
        })
      })

      it('GET /Customer?limit=foo 200 - evaluates to NaN', (done) => {
        request.get({
          url: `${testUrl}/api/v1/Customer`,
          qs: {
            limit: 'foo'
          },
          json: true
        }, (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          assert.equal(body.length, 3)
          done()
        })
      })
    })

    describe('skip', () => {
      it('GET /Customer?skip=1 200', (done) => {
        request.get({
          url: `${testUrl}/api/v1/Customer`,
          qs: {
            skip: 1
          },
          json: true
        }, (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          assert.equal(body.length, 2)
          done()
        })
      })

      it('GET /Customer?skip=foo 200 - evaluates to NaN', (done) => {
        request.get({
          url: `${testUrl}/api/v1/Customer`,
          qs: {
            skip: 'foo'
          },
          json: true
        }, (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          assert.equal(body.length, 3)
          done()
        })
      })
    })

    describe('sort', () => {
      it('GET /Customer?sort=name 200', (done) => {
        request.get({
          url: `${testUrl}/api/v1/Customer`,
          qs: {
            sort: 'name'
          },
          json: true
        }, (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          assert.equal(body.length, 3)
          assert.equal(body[0].name, 'Bob')
          assert.equal(body[1].name, 'John')
          assert.equal(body[2].name, 'Mike')
          done()
        })
      })

      it('GET /Customer?sort=-name 200', (done) => {
        request.get({
          url: `${testUrl}/api/v1/Customer`,
          qs: {
            sort: '-name'
          },
          json: true
        }, (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          assert.equal(body.length, 3)
          assert.equal(body[0].name, 'Mike')
          assert.equal(body[1].name, 'John')
          assert.equal(body[2].name, 'Bob')
          done()
        })
      })

      it('GET /Customer?sort={"name":1} 200', (done) => {
        request.get({
          url: `${testUrl}/api/v1/Customer`,
          qs: {
            sort: {
              name: 1
            }
          },
          json: true
        }, (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          assert.equal(body.length, 3)
          assert.equal(body[0].name, 'Bob')
          assert.equal(body[1].name, 'John')
          assert.equal(body[2].name, 'Mike')
          done()
        })
      })

      it('GET /Customer?sort={"name":-1} 200', (done) => {
        request.get({
          url: `${testUrl}/api/v1/Customer`,
          qs: {
            sort: {
              name: -1
            }
          },
          json: true
        }, (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          assert.equal(body.length, 3)
          assert.equal(body[0].name, 'Mike')
          assert.equal(body[1].name, 'John')
          assert.equal(body[2].name, 'Bob')
          done()
        })
      })
    })

    describe('query', () => {
      it('GET /Customer?query={} 200 - empty object', (done) => {
        request.get({
          url: `${testUrl}/api/v1/Customer`,
          qs: {
            query: JSON.stringify({})
          },
          json: true
        }, (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          assert.equal(body.length, 3)
          done()
        })
      })

      it('GET /Customer?query={"$near": { "$geometry": { "coordinates": [45.2667, 72.1500] } }} 200 - coordinates', (done) => {
        request.get({
          url: `${testUrl}/api/v1/Customer`,
          qs: {
            query: JSON.stringify({
              coordinates: {
                $near: {
                  $geometry: {
                    type: 'Point',
                    coordinates: [45.2667, 72.1500]
                  },
                  $maxDistance: 1000
                }
              }
            })
          },
          json: true
        }, (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          assert.equal(body.length, 1)
          done()
        })
      })

      it('GET /Customer?query=invalidJson 400 - invalid json', (done) => {
        request.get({
          url: `${testUrl}/api/v1/Customer`,
          qs: {
            query: 'invalidJson'
          },
          json: true
        }, (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 400)
          assert.deepEqual(body, {
            name: 'Error',
            message: 'invalid_json_query'
          })
          done()
        })
      })

      describe('string', () => {
        it('GET /Customer?query={"name":"John"} 200 - exact match', (done) => {
          request.get({
            url: `${testUrl}/api/v1/Customer`,
            qs: {
              query: JSON.stringify({
                name: 'John'
              })
            },
            json: true
          }, (err, res, body) => {
            assert.ok(!err)
            assert.equal(res.statusCode, 200)
            assert.equal(body.length, 1)
            assert.equal(body[0].name, 'John')
            done()
          })
        })

        it('GET /Customer?query={"favorites.animal":"Jaguar"} 200 - exact match (nested property)', (done) => {
          request.get({
            url: `${testUrl}/api/v1/Customer`,
            qs: {
              query: JSON.stringify({
                'favorites.animal': 'Jaguar'
              })
            },
            json: true
          }, (err, res, body) => {
            assert.ok(!err)
            assert.equal(res.statusCode, 200)
            assert.equal(body.length, 1)
            assert.equal(body[0].favorites.animal, 'Jaguar')
            done()
          })
        })

        it('GET /Customer?query={"name":{"$regex":"^J"}} 200 - name starting with', (done) => {
          request.get({
            url: `${testUrl}/api/v1/Customer`,
            qs: {
              query: JSON.stringify({
                name: { $regex: '^J' }
              })
            },
            json: true
          }, (err, res, body) => {
            assert.ok(!err)
            assert.equal(res.statusCode, 200)
            assert.equal(body.length, 1)
            assert.ok(body[0].name[0] === 'J')
            done()
          })
        })

        it('GET /Customer?query={"name":["Bob","John"]}&sort=name 200 - in', (done) => {
          request.get({
            url: `${testUrl}/api/v1/Customer`,
            qs: {
              query: JSON.stringify({
                name: ['Bob', 'John']
              }),
              sort: 'name'
            },
            json: true
          }, (err, res, body) => {
            assert.ok(!err)
            assert.equal(res.statusCode, 200)
            assert.equal(body.length, 2)
            assert.equal(body[0].name, 'Bob')
            assert.equal(body[1].name, 'John')
            done()
          })
        })
      })

      describe('number', () => {
        it('GET /Customer?query={"age":"24"} 200 - exact match', (done) => {
          request.get({
            url: `${testUrl}/api/v1/Customer`,
            qs: {
              query: JSON.stringify({
                age: 24
              })
            },
            json: true
          }, (err, res, body) => {
            assert.ok(!err)
            assert.equal(res.statusCode, 200)
            assert.equal(body.length, 1)
            assert.equal(body[0].age, 24)
            done()
          })
        })

        it('GET /Customer?query={"age":["12","24"]}&sort=age 200 - in', (done) => {
          request.get({
            url: `${testUrl}/api/v1/Customer`,
            qs: {
              query: JSON.stringify({
                age: ['12', '24']
              }),
              sort: 'age'
            },
            json: true
          }, (err, res, body) => {
            assert.ok(!err)
            assert.equal(res.statusCode, 200)
            assert.equal(body.length, 2)
            assert.equal(body[0].age, 12)
            assert.equal(body[1].age, 24)
            done()
          })
        })
      })
    })

    describe('select', () => {
      it('GET /Customer?select=["name"] 200 - only include', (done) => {
        request.get({
          url: `${testUrl}/api/v1/Customer`,
          qs: {
            select: ['name']
          },
          json: true
        }, (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          assert.equal(body.length, 3)
          body.forEach((item) => {
            assert.equal(Object.keys(item).length, 2)
            assert.ok(item._id)
            assert.ok(item.name)
          })
          done()
        })
      })

      it('GET /Customer?select=name 200 - only include', (done) => {
        request.get({
          url: `${testUrl}/api/v1/Customer`,
          qs: {
            select: 'name'
          },
          json: true
        }, (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          assert.equal(body.length, 3)
          body.forEach((item) => {
            assert.equal(Object.keys(item).length, 2)
            assert.ok(item._id)
            assert.ok(item.name)
          })
          done()
        })
      })

      it('GET /Customer?select=favorites.animal 200 - only include (nested field)', (done) => {
        request.get({
          url: `${testUrl}/api/v1/Customer`,
          qs: {
            select: 'favorites.animal'
          },
          json: true
        }, (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          assert.equal(body.length, 3)
          body.forEach((item) => {
            assert.equal(Object.keys(item).length, 2)
            assert.ok(item._id)
            assert.ok(item.favorites)
            assert.ok(item.favorites.animal)
            assert.ok(item.favorites.color === undefined)
          })
          done()
        })
      })

      it('GET /Customer?select=-name 200 - exclude name', (done) => {
        request.get({
          url: `${testUrl}/api/v1/Customer`,
          qs: {
            select: '-name'
          },
          json: true
        }, (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          assert.equal(body.length, 3)
          body.forEach((item) => {
            assert.ok(item.name === undefined)
          })
          done()
        })
      })

      it('GET /Customer?select={"name":1} 200 - only include name', (done) => {
        request.get({
          url: `${testUrl}/api/v1/Customer`,
          qs: {
            select: JSON.stringify({
              name: 1
            })
          },
          json: true
        }, (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          assert.equal(body.length, 3)
          body.forEach((item) => {
            assert.equal(Object.keys(item).length, 2)
            assert.ok(item._id)
            assert.ok(item.name)
          })
          done()
        })
      })

      it('GET /Customer?select={"name":0} 200 - exclude name', (done) => {
        request.get({
          url: `${testUrl}/api/v1/Customer`,
          qs: {
            select: JSON.stringify({
              name: 0
            })
          },
          json: true
        }, (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          assert.equal(body.length, 3)
          body.forEach((item) => {
            assert.ok(item.name === undefined)
          })
          done()
        })
      })
    })

    describe('populate', () => {
      it('GET /Invoice?populate=customer 200', (done) => {
        request.get({
          url: `${testUrl}/api/v1/Invoice`,
          qs: {
            populate: 'customer'
          },
          json: true
        }, (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          assert.equal(body.length, 3)
          body.forEach((invoice) => {
            assert.ok(invoice.customer)
            assert.ok(invoice.customer._id)
            assert.ok(invoice.customer.name)
            assert.ok(invoice.customer.age)
          })
          done()
        })
      })

      it('GET /Invoice?populate={path:"customer"} 200', (done) => {
        request.get({
          url: `${testUrl}/api/v1/Invoice`,
          qs: {
            populate: JSON.stringify({
              path: 'customer'
            })
          },
          json: true
        }, (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          assert.equal(body.length, 3)
          body.forEach((invoice) => {
            assert.ok(invoice.customer)
            assert.ok(invoice.customer._id)
            assert.ok(invoice.customer.name)
            assert.ok(invoice.customer.age)
          })
          done()
        })
      })

      it('GET /Invoice?populate=[{path:"customer"}] 200', (done) => {
        request.get({
          url: `${testUrl}/api/v1/Invoice`,
          qs: {
            populate: JSON.stringify([{
              path: 'customer'
            }])
          },
          json: true
        }, (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          assert.equal(body.length, 3)
          body.forEach((invoice) => {
            assert.ok(invoice.customer)
            assert.ok(invoice.customer._id)
            assert.ok(invoice.customer.name)
            assert.ok(invoice.customer.age)
          })
          done()
        })
      })

      it('GET /Customer?populate=favorites.purchase.item 200 - nested field', (done) => {
        request.get({
          url: `${testUrl}/api/v1/Customer`,
          qs: {
            populate: 'favorites.purchase.item'
          },
          json: true
        }, (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          assert.equal(body.length, 3)
          body.forEach((customer) => {
            assert.ok(customer.favorites.purchase)
            assert.ok(customer.favorites.purchase.item)
            assert.ok(customer.favorites.purchase.item._id)
            assert.ok(customer.favorites.purchase.item.name)
            assert.ok(customer.favorites.purchase.number)
          })
          done()
        })
      })

      it('GET /Invoice?populate=customer.account 200 - ignore deep populate', (done) => {
        request.get({
          url: `${testUrl}/api/v1/Invoice`,
          qs: {
            populate: 'customer.account'
          },
          json: true
        }, (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          assert.equal(body.length, 3)
          body.forEach((invoice) => {
            assert.ok(invoice.customer)
            assert.equal(typeof invoice.customer, 'string')
          })
          done()
        })
      })

      it('GET /Invoice?populate=evilCustomer 200 - ignore unknown field', (done) => {
        request.get({
          url: `${testUrl}/api/v1/Invoice`,
          qs: {
            populate: 'evilCustomer'
          },
          json: true
        }, (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          assert.equal(body.length, 3)
          done()
        })
      })

      describe('with select', () => {
        it('GET Invoices?populate=customer&select=amount 200 - only include amount and customer document', (done) => {
          request.get({
            url: `${testUrl}/api/v1/Invoice`,
            qs: {
              populate: 'customer',
              select: 'amount'
            },
            json: true
          }, (err, res, body) => {
            assert.ok(!err)
            assert.equal(res.statusCode, 200)
            assert.equal(body.length, 3)
            body.forEach((invoice) => {
              assert.ok(invoice.amount)
              assert.ok(invoice.customer)
              assert.ok(invoice.customer._id)
              assert.ok(invoice.customer.name)
              assert.ok(invoice.customer.age)
              assert.equal(invoice.receipt, undefined)
            })
            done()
          })
        })

        it('GET Invoices?populate=customer&select=amount,customer.name 200 - only include amount and customer name', (done) => {
          request.get({
            url: `${testUrl}/api/v1/Invoice`,
            qs: {
              populate: 'customer',
              select: 'amount,customer.name'
            },
            json: true
          }, (err, res, body) => {
            assert.ok(!err)
            assert.equal(res.statusCode, 200)
            assert.equal(body.length, 3)
            body.forEach((invoice) => {
              assert.ok(invoice.amount)
              assert.ok(invoice.customer)
              assert.ok(invoice.customer._id)
              assert.ok(invoice.customer.name)
              assert.equal(invoice.customer.age, undefined)
              assert.equal(invoice.receipt, undefined)
            })
            done()
          })
        })

        it('GET Invoices?populate=customer&select=customer.name 200 - include all invoice fields, but only include customer name', (done) => {
          request.get({
            url: `${testUrl}/api/v1/Invoice`,
            qs: {
              populate: 'customer',
              select: 'customer.name'
            },
            json: true
          }, (err, res, body) => {
            assert.ok(!err)
            assert.equal(res.statusCode, 200)
            assert.equal(body.length, 3)
            body.forEach((invoice) => {
              assert.ok(invoice.amount)
              assert.ok(invoice.receipt)
              assert.ok(invoice.customer)
              assert.ok(invoice.customer._id)
              assert.ok(invoice.customer.name)
              assert.equal(invoice.customer.age, undefined)
            })
            done()
          })
        })

        it('GET Invoices?populate=customer&select=-customer.name 200 - include all invoice and fields, but exclude customer name', (done) => {
          request.get({
            url: `${testUrl}/api/v1/Invoice`,
            qs: {
              populate: 'customer',
              select: '-customer.name'
            },
            json: true
          }, (err, res, body) => {
            assert.ok(!err)
            assert.equal(res.statusCode, 200)
            assert.equal(body.length, 3)
            body.forEach((invoice) => {
              assert.ok(invoice.amount)
              assert.ok(invoice.receipt)
              assert.ok(invoice.customer)
              assert.ok(invoice.customer._id)
              assert.ok(invoice.customer.age)
              assert.equal(invoice.customer.name, undefined)
            })
            done()
          })
        })

        it('GET Invoices?populate=customer&select=amount,-customer.-id,customer.name 200 - only include amount and customer name and exclude customer _id', (done) => {
          request.get({
            url: `${testUrl}/api/v1/Invoice`,
            qs: {
              populate: 'customer',
              select: 'amount,-customer._id,customer.name'
            },
            json: true
          }, (err, res, body) => {
            assert.ok(!err)
            assert.equal(res.statusCode, 200)
            assert.equal(body.length, 3)
            body.forEach((invoice) => {
              assert.ok(invoice.amount)
              assert.ok(invoice.customer)
              assert.ok(invoice.customer.name)
              assert.equal(invoice.receipt, undefined)
              assert.equal(invoice.customer._id, undefined)
              assert.equal(invoice.customer.age, undefined)
            })
            done()
          })
        })

        it('GET Invoices?populate=customer&select=customer.name,customer.age 200 - only include customer name and age', (done) => {
          request.get({
            url: `${testUrl}/api/v1/Invoice`,
            qs: {
              populate: 'customer',
              select: 'customer.name,customer.age'
            },
            json: true
          }, (err, res, body) => {
            assert.ok(!err)
            assert.equal(res.statusCode, 200)
            assert.equal(body.length, 3)
            body.forEach((invoice) => {
              assert.ok(invoice.amount)
              assert.ok(invoice.receipt)
              assert.ok(invoice.customer)
              assert.ok(invoice.customer._id)
              assert.ok(invoice.customer.name)
              assert.ok(invoice.customer.age)
            })
            done()
          })
        })
      })
    })

    describe('distinct', () => {
      it('GET /Customer?distinct=name 200 - array of unique names', (done) => {
        request.get({
          url: `${testUrl}/api/v1/Customer`,
          qs: {
            distinct: 'name'
          },
          json: true
        }, (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          assert.equal(body.length, 3)
          assert.equal(body[0], 'Bob')
          assert.equal(body[1], 'John')
          assert.equal(body[2], 'Mike')
          done()
        })
      })
    })

    describe('count', () => {
      it('GET /Customer/count 200', (done) => {
        request.get({
          url: `${testUrl}/api/v1/Customer/count`,
          json: true
        }, (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          assert.equal(body.count, 3)
          done()
        })
      })

      it('GET /Customer/count 200 - ignores sort', (done) => {
        request.get({
          url: `${testUrl}/api/v1/Customer/count`,
          qs: {
            sort: {
              _id: 1
            }
          },
          json: true
        }, (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          assert.equal(body.count, 3)
          done()
        })
      })
    })

    describe('shallow', () => {
      it('GET /Customer/:id/shallow 200 - created id', (done) => {
        request.get({
          url: `${testUrl}/api/v1/Customer/${customers[0]._id}/shallow`,
          json: true
        }, (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          assert.equal(body.name, 'Bob')
          done()
        })
      })

      it('GET /Customer/:id/shallow 404 - invalid id', (done) => {
        request.get({
          url: `${testUrl}/api/v1/Customer/${invalidId}/shallow`,
          json: true
        }, (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 404)
          done()
        })
      })

      it('GET /Customer/:id/shallow 404 - random id', (done) => {
        request.get({
          url: `${testUrl}/api/v1/Customer/${randomId}/shallow`,
          json: true
        }, (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 404)
          done()
        })
      })
    })
  })
}
