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

  describe('Read documents', () => {
    let app = createFn()
    let server
    let customers

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

        db.models.Product.create({
          name: 'Bobsleigh'
        }).then(createdProduct => {
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
            }
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
        }).then(createdCustomers => {
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
        }).then(createdInvoices => {
          server = app.listen(testPort, done)
        }, err => {
          done(err)
        })
      })
    })

    afterEach(done => {
      dismantle(app, server, done)
    })

    it('GET /Customers 200', done => {
      request.get({
        url: `${testUrl}/api/v1/Customers`,
        json: true
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        assert.equal(body.length, 3)
        done()
      })
    })

    it('GET /Customers/:id 200 - created id', done => {
      request.get({
        url: `${testUrl}/api/v1/Customers/${customers[0]._id}`,
        json: true
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        assert.equal(body.name, 'Bob')
        done()
      })
    })

    it('GET /Customers/:id 400 - invalid id', done => {
      request.get({
        url: `${testUrl}/api/v1/Customers/${invalidId}`,
        json: true
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 400)
        done()
      })
    })

    it('GET /Customers/:id 404 - random id', done => {
      request.get({
        url: `${testUrl}/api/v1/Customers/${randomId}`,
        json: true
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 404)
        done()
      })
    })

    describe('ignore unknown parameters', () => {
      it('GET /Customers?foo=bar 200', done => {
        request.get({
          url: `${testUrl}/api/v1/Customers`,
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
      it('GET /Customers?limit=1 200', done => {
        request.get({
          url: `${testUrl}/api/v1/Customers`,
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

      it('GET /Customers?limit=foo 200 - evaluates to NaN', done => {
        request.get({
          url: `${testUrl}/api/v1/Customers`,
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
      it('GET /Customers?skip=1 200', done => {
        request.get({
          url: `${testUrl}/api/v1/Customers`,
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

      it('GET /Customers?skip=foo 200 - evaluates to NaN', done => {
        request.get({
          url: `${testUrl}/api/v1/Customers`,
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
      it('GET /Customers?sort=name 200', done => {
        request.get({
          url: `${testUrl}/api/v1/Customers`,
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

      it('GET /Customers?sort=-name 200', done => {
        request.get({
          url: `${testUrl}/api/v1/Customers`,
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

      it('GET /Customers?sort={"name":1} 200', done => {
        request.get({
          url: `${testUrl}/api/v1/Customers`,
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

      it('GET /Customers?sort={"name":-1} 200', done => {
        request.get({
          url: `${testUrl}/api/v1/Customers`,
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
      it('GET /Customers?query={} 200 - empty object', done => {
        request.get({
          url: `${testUrl}/api/v1/Customers`,
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

      it('GET /Customers?query=invalidJson 400 - invalid json', done => {
        request.get({
          url: `${testUrl}/api/v1/Customers`,
          qs: {
            query: 'invalidJson'
          },
          json: true
        }, (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 400)
          done()
        })
      })

      describe('string', () => {
        it('GET /Customers?query={"name":"John"} 200 - exact match', done => {
          request.get({
            url: `${testUrl}/api/v1/Customers`,
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

        it('GET /Customers?query={"favorites.animal":"Jaguar"} 200 - exact match (nested property)', done => {
          request.get({
            url: `${testUrl}/api/v1/Customers`,
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

        it('GET /Customers?query={"name":"~^J"} 200 - name starting with', done => {
          request.get({
            url: `${testUrl}/api/v1/Customers`,
            qs: {
              query: JSON.stringify({
                name: '~^J'
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

        it('GET /Customers?query={"name":">=John"} 200 - greater than or equal', done => {
          request.get({
            url: `${testUrl}/api/v1/Customers`,
            qs: {
              query: JSON.stringify({
                name: '>=John'
              })
            },
            json: true
          }, (err, res, body) => {
            assert.ok(!err)
            assert.equal(res.statusCode, 200)
            assert.equal(body.length, 2)
            assert.ok(body[0].name >= 'John')
            assert.ok(body[1].name >= 'John')
            done()
          })
        })

        it('GET /Customers?query={"name":">John"} 200 - greater than', done => {
          request.get({
            url: `${testUrl}/api/v1/Customers`,
            qs: {
              query: JSON.stringify({
                name: '>John'
              })
            },
            json: true
          }, (err, res, body) => {
            assert.ok(!err)
            assert.equal(res.statusCode, 200)
            assert.equal(body.length, 1)
            assert.ok(body[0].name > 'John')
            done()
          })
        })

        it('GET /Customers?query={"name":"<=John"} 200 - lower than or equal', done => {
          request.get({
            url: `${testUrl}/api/v1/Customers`,
            qs: {
              query: JSON.stringify({
                name: '<=John'
              })
            },
            json: true
          }, (err, res, body) => {
            assert.ok(!err)
            assert.equal(res.statusCode, 200)
            assert.equal(body.length, 2)
            assert.ok(body[0].name[0] <= 'John')
            assert.ok(body[1].name[0] <= 'John')
            done()
          })
        })

        it('GET /Customers?query={"name":"<John"} 200 - lower than', done => {
          request.get({
            url: `${testUrl}/api/v1/Customers`,
            qs: {
              query: JSON.stringify({
                name: '<John'
              })
            },
            json: true
          }, (err, res, body) => {
            assert.ok(!err)
            assert.equal(res.statusCode, 200)
            assert.equal(body.length, 1)
            assert.ok(body[0].name[0] < 'John')
            done()
          })
        })

        it('GET /Customers?query={"name":"!=John"} 200 - not equal', done => {
          request.get({
            url: `${testUrl}/api/v1/Customers`,
            qs: {
              query: JSON.stringify({
                name: '!=John'
              })
            },
            json: true
          }, (err, res, body) => {
            assert.ok(!err)
            assert.equal(res.statusCode, 200)
            assert.equal(body.length, 2)
            assert.notEqual(body[0].name, 'John')
            assert.notEqual(body[1].name, 'John')
            done()
          })
        })

        // This feature was disabled because it requires MongoDB 3
        it.skip('GET /Customers?query={"name":"=John"} 200 - equal', done => {
          request.get({
            url: `${testUrl}/api/v1/Customers`,
            qs: {
              query: JSON.stringify({
                name: '=John'
              })
            },
            json: true
          }, (err, res, body) => {
            assert.ok(!err)
            assert.equal(res.statusCode, 200)
            assert.equal(body.length, 1)
            assert.ok(body[0].name === 'John')
            done()
          })
        })

        it('GET /Customers?query={"name":["Bob","John"]}&sort=name 200 - in', done => {
          request.get({
            url: `${testUrl}/api/v1/Customers`,
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
        it('GET /Customers?query={"age":"24"} 200 - exact match', done => {
          request.get({
            url: `${testUrl}/api/v1/Customers`,
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

        it('GET /Customers?query={"age":"~2"} 400 - regex on number field', done => {
          request.get({
            url: `${testUrl}/api/v1/Customers`,
            qs: {
              query: JSON.stringify({
                age: '~2'
              })
            },
            json: true
          }, (err, res, body) => {
            assert.ok(!err)
            assert.equal(res.statusCode, 400)
            done()
          })
        })

        it('GET /Customers?query={"age":">=24"} 200 - greater than or equal', done => {
          request.get({
            url: `${testUrl}/api/v1/Customers`,
            qs: {
              query: JSON.stringify({
                age: '>=24'
              })
            },
            json: true
          }, (err, res, body) => {
            assert.ok(!err)
            assert.equal(res.statusCode, 200)
            assert.equal(body.length, 2)
            assert.ok(body[0].age >= 24)
            assert.ok(body[1].age >= 24)
            done()
          })
        })

        it('GET /Customers?query={"age":">24"} 200 - greater than', done => {
          request.get({
            url: `${testUrl}/api/v1/Customers`,
            qs: {
              query: JSON.stringify({
                age: '>24'
              })
            },
            json: true
          }, (err, res, body) => {
            assert.ok(!err)
            assert.equal(res.statusCode, 200)
            assert.equal(body.length, 1)
            assert.ok(body[0].age > 24)
            done()
          })
        })

        it('GET /Customers?query={"age":"<=24"} 200 - lower than or equal', done => {
          request.get({
            url: `${testUrl}/api/v1/Customers`,
            qs: {
              query: JSON.stringify({
                age: '<=24'
              })
            },
            json: true
          }, (err, res, body) => {
            assert.ok(!err)
            assert.equal(res.statusCode, 200)
            assert.equal(body.length, 2)
            assert.ok(body[0].age <= 24)
            assert.ok(body[1].age <= 24)
            done()
          })
        })

        it('GET /Customers?query={"age":"<24"} 200 - lower than', done => {
          request.get({
            url: `${testUrl}/api/v1/Customers`,
            qs: {
              query: JSON.stringify({
                age: '<24'
              })
            },
            json: true
          }, (err, res, body) => {
            assert.ok(!err)
            assert.equal(res.statusCode, 200)
            assert.equal(body.length, 1)
            assert.equal(body[0].age, 12)
            done()
          })
        })

        it('GET /Customers?query={"age":"!=24"} 200 - not equal', done => {
          request.get({
            url: `${testUrl}/api/v1/Customers`,
            qs: {
              query: JSON.stringify({
                age: '!=24'
              })
            },
            json: true
          }, (err, res, body) => {
            assert.ok(!err)
            assert.equal(res.statusCode, 200)
            assert.equal(body.length, 2)
            assert.notEqual(body[0].age, 24)
            assert.notEqual(body[1].age, 24)
            done()
          })
        })

        // This feature was disabled because it requires MongoDB 3
        it.skip('GET /Customers?query={"age":"=24"} 200 - equal', done => {
          request.get({
            url: `${testUrl}/api/v1/Customers`,
            qs: {
              query: JSON.stringify({
                age: '=24'
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

        it('GET /Customers?query={"age":["12","24"]}&sort=age 200 - in', done => {
          request.get({
            url: `${testUrl}/api/v1/Customers`,
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
      it('GET /Customers?select=name 200 - only include', done => {
        request.get({
          url: `${testUrl}/api/v1/Customers`,
          qs: {
            select: 'name'
          },
          json: true
        }, (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          assert.equal(body.length, 3)
          body.forEach(item => {
            assert.equal(Object.keys(item).length, 2)
            assert.ok(item._id)
            assert.ok(item.name)
          })
          done()
        })
      })

      it('GET /Customers?select=favorites.animal 200 - only include (nested field)', done => {
        request.get({
          url: `${testUrl}/api/v1/Customers`,
          qs: {
            select: 'favorites.animal'
          },
          json: true
        }, (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          assert.equal(body.length, 3)
          body.forEach(item => {
            assert.equal(Object.keys(item).length, 2)
            assert.ok(item._id)
            assert.ok(item.favorites)
            assert.ok(item.favorites.animal)
            assert.ok(item.favorites.color === undefined)
          })
          done()
        })
      })

      it('GET /Customers?select=-name 200 - exclude name', done => {
        request.get({
          url: `${testUrl}/api/v1/Customers`,
          qs: {
            select: '-name'
          },
          json: true
        }, (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          assert.equal(body.length, 3)
          body.forEach(item => {
            assert.ok(item.name === undefined)
          })
          done()
        })
      })

      it('GET /Customers?select={"name":1} 200 - only include name', done => {
        request.get({
          url: `${testUrl}/api/v1/Customers`,
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
          body.forEach(item => {
            assert.equal(Object.keys(item).length, 2)
            assert.ok(item._id)
            assert.ok(item.name)
          })
          done()
        })
      })

      it('GET /Customers?select={"name":0} 200 - exclude name', done => {
        request.get({
          url: `${testUrl}/api/v1/Customers`,
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
          body.forEach(item => {
            assert.ok(item.name === undefined)
          })
          done()
        })
      })
    })

    describe('populate', () => {
      it('GET /Invoices?populate=customer 200', done => {
        request.get({
          url: `${testUrl}/api/v1/Invoices`,
          qs: {
            populate: 'customer'
          },
          json: true
        }, (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          assert.equal(body.length, 3)
          body.forEach(invoice => {
            assert.ok(invoice.customer)
            assert.ok(invoice.customer._id)
            assert.ok(invoice.customer.name)
            assert.ok(invoice.customer.age)
          })
          done()
        })
      })

      it('GET /Invoices?populate={path:"customer"} 200', done => {
        request.get({
          url: `${testUrl}/api/v1/Invoices`,
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
          body.forEach(invoice => {
            assert.ok(invoice.customer)
            assert.ok(invoice.customer._id)
            assert.ok(invoice.customer.name)
            assert.ok(invoice.customer.age)
          })
          done()
        })
      })

      it('GET /Invoices?populate=[{path:"customer"}] 200', done => {
        request.get({
          url: `${testUrl}/api/v1/Invoices`,
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
          body.forEach(invoice => {
            assert.ok(invoice.customer)
            assert.ok(invoice.customer._id)
            assert.ok(invoice.customer.name)
            assert.ok(invoice.customer.age)
          })
          done()
        })
      })

      it('GET /Customers?populate=favorites.purchase.item 200 - nested field', done => {
        request.get({
          url: `${testUrl}/api/v1/Customers`,
          qs: {
            populate: 'favorites.purchase.item'
          },
          json: true
        }, (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          assert.equal(body.length, 3)
          body.forEach(customer => {
            assert.ok(customer.favorites.purchase)
            assert.ok(customer.favorites.purchase.item)
            assert.ok(customer.favorites.purchase.item._id)
            assert.ok(customer.favorites.purchase.item.name)
            assert.ok(customer.favorites.purchase.number)
          })
          done()
        })
      })

      it('GET /Invoices?populate=customer.account 200 - ignore deep populate', done => {
        request.get({
          url: `${testUrl}/api/v1/Invoices`,
          qs: {
            populate: 'customer.account'
          },
          json: true
        }, (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          assert.equal(body.length, 3)
          body.forEach(invoice => {
            assert.ok(invoice.customer)
            assert.equal(typeof invoice.customer, 'string')
          })
          done()
        })
      })

      it('GET /Invoices?populate=evilCustomer 200 - ignore unknown field', done => {
        request.get({
          url: `${testUrl}/api/v1/Invoices`,
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
        it('GET Invoices?populate=customer&select=amount 200 - only include amount and customer document', done => {
          request.get({
            url: `${testUrl}/api/v1/Invoices`,
            qs: {
              populate: 'customer',
              select: 'amount'
            },
            json: true
          }, (err, res, body) => {
            assert.ok(!err)
            assert.equal(res.statusCode, 200)
            assert.equal(body.length, 3)
            body.forEach(invoice => {
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

        it('GET Invoices?populate=customer&select=amount,customer.name 200 - only include amount and customer name', done => {
          request.get({
            url: `${testUrl}/api/v1/Invoices`,
            qs: {
              populate: 'customer',
              select: 'amount,customer.name'
            },
            json: true
          }, (err, res, body) => {
            assert.ok(!err)
            assert.equal(res.statusCode, 200)
            assert.equal(body.length, 3)
            body.forEach(invoice => {
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

        it('GET Invoices?populate=customer&select=customer.name 200 - include all invoice fields, but only include customer name', done => {
          request.get({
            url: `${testUrl}/api/v1/Invoices`,
            qs: {
              populate: 'customer',
              select: 'customer.name'
            },
            json: true
          }, (err, res, body) => {
            assert.ok(!err)
            assert.equal(res.statusCode, 200)
            assert.equal(body.length, 3)
            body.forEach(invoice => {
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

        it('GET Invoices?populate=customer&select=-customer.name 200 - include all invoice and fields, but exclude customer name', done => {
          request.get({
            url: `${testUrl}/api/v1/Invoices`,
            qs: {
              populate: 'customer',
              select: '-customer.name'
            },
            json: true
          }, (err, res, body) => {
            assert.ok(!err)
            assert.equal(res.statusCode, 200)
            assert.equal(body.length, 3)
            body.forEach(invoice => {
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

        it('GET Invoices?populate=customer&select=amount,-customer.-id,customer.name 200 - only include amount and customer name and exclude customer _id', done => {
          request.get({
            url: `${testUrl}/api/v1/Invoices`,
            qs: {
              populate: 'customer',
              select: 'amount,-customer._id,customer.name'
            },
            json: true
          }, (err, res, body) => {
            assert.ok(!err)
            assert.equal(res.statusCode, 200)
            assert.equal(body.length, 3)
            body.forEach(invoice => {
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

        it('GET Invoices?populate=customer&select=customer.name,customer.age 200 - only include customer name and age', done => {
          request.get({
            url: `${testUrl}/api/v1/Invoices`,
            qs: {
              populate: 'customer',
              select: 'customer.name,customer.age'
            },
            json: true
          }, (err, res, body) => {
            assert.ok(!err)
            assert.equal(res.statusCode, 200)
            assert.equal(body.length, 3)
            body.forEach(invoice => {
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
      it('GET /Customers?distinct=name 200 - array of unique names', done => {
        request.get({
          url: `${testUrl}/api/v1/Customers`,
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
      it('GET /Customers/count 200', done => {
        request.get({
          url: `${testUrl}/api/v1/Customers/count`,
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
      it('GET /Customers/:id/shallow 200 - created id', done => {
        request.get({
          url: util.format('%s/api/v1/Customers/%s/shallow', testUrl, customers[0]._id),
          json: true
        }, (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          assert.equal(body.name, 'Bob')
          done()
        })
      })

      it('GET /Customers/:id/shallow 400 - invalid id', done => {
        request.get({
          url: `${testUrl}/api/v1/Customers/${invalidId}/shallow`,
          json: true
        }, (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 400)
          done()
        })
      })

      it('GET /Customers/:id/shallow 404 - random id', done => {
        request.get({
          url: `${testUrl}/api/v1/Customers/${randomId}/shallow`,
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
