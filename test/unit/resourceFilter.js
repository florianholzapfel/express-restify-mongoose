var assert = require('assert')

describe('resourceFilter', function () {
  var Filter = require('../../lib/resource_filter')

  describe('getExcluded', function () {
    var filter = new Filter({})

    describe('private', function () {
      it('returns empty array', function () {
        var excluded = filter.getExcluded({
          access: 'private'
        })

        assert.equal(Array.isArray(excluded), true)
        assert.equal(excluded.length, 0)
      })
    })

    describe('protected', function () {
      it('returns empty array', function () {
        var excluded = filter.getExcluded({
          access: 'protected',
          filteredKeys: {}
        })

        assert.equal(Array.isArray(excluded), true)
        assert.equal(excluded.length, 0)
      })

      it('returns empty array', function () {
        var excluded = filter.getExcluded({
          access: 'protected'
        })

        assert.equal(Array.isArray(excluded), true)
        assert.equal(excluded.length, 0)
      })

      it('returns array of private fields', function () {
        var excluded = filter.getExcluded({
          access: 'protected',
          filteredKeys: {
            private: ['foo'],
            protected: ['bar']
          }
        })

        assert.equal(Array.isArray(excluded), true)
        assert.equal(excluded.length, 1)
        assert.deepEqual(excluded, ['foo'])
      })

      it('returns array of private fields', function () {
        var excluded = filter.getExcluded({
          access: 'protected',
          modelName: 'FooModel',
          excludedMap: {
            FooModel: {
              private: ['foo'],
              protected: ['bar']
            }
          }
        })

        assert.equal(Array.isArray(excluded), true)
        assert.equal(excluded.length, 1)
        assert.deepEqual(excluded, ['foo'])
      })
    })

    describe('public', function () {
      it('returns empty array', function () {
        var excluded = filter.getExcluded({
          access: 'public',
          filteredKeys: {}
        })

        assert.equal(Array.isArray(excluded), true)
        assert.equal(excluded.length, 0)
      })

      it('returns empty array', function () {
        var excluded = filter.getExcluded({
          access: 'public'
        })

        assert.equal(Array.isArray(excluded), true)
        assert.equal(excluded.length, 0)
      })

      it('returns array of private and protected fields', function () {
        var excluded = filter.getExcluded({
          access: 'public',
          filteredKeys: {
            private: ['foo'],
            protected: ['bar']
          }
        })

        assert.equal(Array.isArray(excluded), true)
        assert.equal(excluded.length, 2)
        assert.deepEqual(excluded, ['foo', 'bar'])
      })

      it('returns array of private and protected fields', function () {
        var excluded = filter.getExcluded({
          access: 'public',
          modelName: 'FooModel',
          excludedMap: {
            FooModel: {
              private: ['foo'],
              protected: ['bar']
            }
          }
        })

        assert.equal(Array.isArray(excluded), true)
        assert.equal(excluded.length, 2)
        assert.deepEqual(excluded, ['foo', 'bar'])
      })
    })
  })

  describe('getModelAtPath', function () {
    var db = require('../integration/setup')()
    var filter = new Filter({})

    db.initialize({
      connect: false
    })

    it('returns nothing', function () {
      var modelName = filter.getModelAtPath(db.models.Invoice.schema, 'foo.bar')

      assert.equal(modelName, undefined)
    })

    it('returns Customer', function () {
      var modelName = filter.getModelAtPath(db.models.Invoice.schema, 'customer')

      assert.equal(modelName, 'Customer')
    })

    it('returns Product', function () {
      var modelName = filter.getModelAtPath(db.models.Invoice.schema, 'products')

      assert.equal(modelName, 'Product')
    })

    it('returns Product', function () {
      var modelName = filter.getModelAtPath(db.models.Customer.schema, 'favorites.purchase.item')

      assert.equal(modelName, 'Product')
    })
  })

  describe('filterItem', function () {
    var filter = new Filter({})

    it('does nothing', function () {
      var item = filter.filterItem()

      assert.equal(item, undefined)
    })

    it('removes excluded keys from a document', function () {
      var doc = {
        foo: {
          bar: {
            baz: '3.14'
          }
        }
      }

      filter.filterItem(doc, ['foo'])

      assert.deepEqual(doc, {})
    })

    it('removes excluded keys from a document', function () {
      var doc = {
        foo: {
          bar: {
            baz: '3.14'
          }
        }
      }

      filter.filterItem(doc, ['foo.bar.baz'])

      assert.deepEqual(doc, {
        foo: {
          bar: {}
        }
      })
    })

    it('removes excluded keys from an array of document', function () {
      var docs = [{
        foo: {
          bar: {
            baz: '3.14'
          }
        }
      }, {
        foo: {
          bar: {
            baz: 'pi'
          }
        }
      }]

      filter.filterItem(docs, ['foo.bar.baz'])

      assert.deepEqual(docs, [{
        foo: {
          bar: {}
        }
      }, {
        foo: {
          bar: {}
        }
      }])
    })
  })

  describe('filterPopulatedItem', function () {
    var db = require('../integration/setup')()

    db.initialize({
      connect: false
    })

    var invoiceFilter = new Filter({
      model: db.models.Invoice
    })

    var customerFilter = new Filter({
      model: db.models.Customer,
      filteredKeys: {
        private: ['name']
      }
    })

    var productFilter = new Filter({
      model: db.models.Product,
      filteredKeys: {
        private: ['name']
      }
    })

    it('does nothing', function () {
      var item = invoiceFilter.filterPopulatedItem(null, {
        populate: []
      })

      assert.equal(item, null)
    })

    it('removes keys in populated document', function () {
      var invoice = {
        customer: {
          name: 'John'
        },
        amount: '42'
      }

      invoiceFilter.filterPopulatedItem(invoice, {
        populate: [{
          path: 'customer'
        }],
        excludedMap: {
          Customer: customerFilter.filteredKeys
        }
      })

      assert.deepEqual(invoice, {
        customer: {},
        amount: '42'
      })
    })

    it('removes keys in array with populated document', function () {
      var invoices = [{
        customer: {
          name: 'John'
        },
        amount: '42'
      }, {
        customer: {
          name: 'Bob'
        },
        amount: '3.14'
      }]

      invoiceFilter.filterPopulatedItem(invoices, {
        populate: [{
          path: 'customer'
        }],
        excludedMap: {
          Customer: customerFilter.filteredKeys
        }
      })

      assert.deepEqual(invoices, [{
        customer: {},
        amount: '42'
      }, {
        customer: {},
        amount: '3.14'
      }])
    })

    it('ignores undefined path', function () {
      var invoice = {
        amount: '42'
      }

      invoiceFilter.filterPopulatedItem(invoice, {
        populate: [{
          path: 'customer'
        }],
        excludedMap: {
          Customer: customerFilter.filteredKeys
        }
      })

      assert.deepEqual(invoice, {
        amount: '42'
      })
    })

    it('skip when populate path is undefined', function () {
      var invoice = {
        customer: {
          name: 'John'
        },
        amount: '42'
      }

      invoiceFilter.filterPopulatedItem(invoice, {
        populate: [{}],
        excludedMap: {
          Customer: customerFilter.filteredKeys
        }
      })

      assert.deepEqual(invoice, {
        customer: {
          name: 'John'
        },
        amount: '42'
      })
    })

    it('removes keys in populated document array', function () {
      var invoice = {
        products: [{
          name: 'Squirt Gun'
        }, {
          name: 'Water Balloons'
        }],
        amount: '42'
      }

      invoiceFilter.filterPopulatedItem(invoice, {
        populate: [{
          path: 'products'
        }],
        excludedMap: {
          Product: productFilter.filteredKeys
        }
      })

      assert.deepEqual(invoice, {
        products: [{}, {}],
        amount: '42'
      })
    })

    it('removes keys in populated document in array', function () {
      var customer = {
        name: 'John',
        purchases: [{
          item: {
            name: 'Squirt Gun'
          }
        }]
      }

      customerFilter.filterPopulatedItem(customer, {
        populate: [{
          path: 'purchases.item'
        }],
        excludedMap: {
          Product: productFilter.filteredKeys
        }
      })

      assert.deepEqual(customer, {
        name: 'John',
        purchases: [{
          item: {}
        }]
      })
    })
  })
})
