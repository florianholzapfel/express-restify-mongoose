var assert = require('assert')

describe('resourceFilter', function () {
  var Filter = require('../../lib/resource_filter')

  describe('removeValueAtPath', function () {
    var filter = new Filter({})

    it('removes root keys', function () {
      var src = {
        foo: 'bar'
      }

      filter.removeValueAtPath(src, 'foo')

      assert.equal(src.foo, undefined)
    })

    it('ignores undefined root keys', function () {
      var src = {
        foo: 'bar'
      }

      filter.removeValueAtPath(src, 'bar')

      assert.deepEqual(src, {
        foo: 'bar'
      })
    })

    it('removes nested keys', function () {
      var src = {
        foo: {
          bar: {
            baz: '42'
          }
        }
      }

      filter.removeValueAtPath(src, 'foo.bar.baz')

      assert.deepEqual(src.foo.bar, {})
    })

    it('ignores undefined nested keys', function () {
      var src = {
        foo: {
          bar: {
            baz: '42'
          }
        }
      }

      filter.removeValueAtPath(src, 'baz.bar.foo')

      assert.deepEqual(src, {
        foo: {
          bar: {
            baz: '42'
          }
        }
      })
    })

    it('removes keys inside object arrays', function () {
      var src = {
        foo: [{
          bar: {
            baz: '3.14'
          }
        }, {
          bar: {
            baz: 'pi'
          }
        }]
      }

      filter.removeValueAtPath(src, 'foo.bar.baz')

      src.foo.forEach(function (foo) {
        assert.deepEqual(foo.bar, {})
      })
    })

    it('removes keys inside object arrays inside object arrays', function () {
      var src = {
        foo: [{
          bar: [{
            baz: 'to'
          }, {
            baz: 'be'
          }]
        }, {
          bar: [{
            baz: 'or'
          }, {
            baz: 'not'
          }]
        }]
      }

      filter.removeValueAtPath(src, 'foo.bar.baz')

      src.foo.forEach(function (foo) {
        foo.bar.forEach(function (bar) {
          assert.deepEqual(bar, {})
        })
      })
    })
  })

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
})
