var async = require('async')
var mongoose = require('mongoose')
var Schema = mongoose.Schema
var util = require('util')

module.exports = function () {
  var opts = {
    toObject: { virtuals: true },
    toJSON: { virtuals: true }
  }

  var Product = new Schema({
    name: { type: String, required: true },
    department: {
      name: String,
      code: Number
    },
    price: Number
  })

  var CustomerSchema = function () {
    Schema.apply(this, arguments)

    this.add({
      name: { type: String, required: true, unique: true },
      // friendlyId: { type: String, unique: true },
      comment: String,
      address: String,
      age: Number,
      favorites: {
        animal: String,
        color: String
      },
      purchases: [{
        item: { type: Schema.Types.ObjectId, ref: 'Product' },
        number: Number
      }],
      creditCard: {
        type: String,
        access: 'protected'
      },
      ssn: {
        type: String,
        access: 'private'
      }
    })
  }

  util.inherits(CustomerSchema, Schema)

  var Customer = new CustomerSchema({}, opts)

  Customer.virtual('info').get(function () {
    return this.name + ' is awesome'
  })

  var RepeatCustomer = new CustomerSchema({
    loyaltyProgram: { type: Schema.Types.ObjectId, ref: 'Account' }
  })

  var invoiceOpts = JSON.parse(JSON.stringify(opts))
  invoiceOpts.versionKey = '__version'

  var Invoice = new Schema({
    customer: { type: Schema.Types.ObjectId, ref: 'Customer' },
    amount: Number,
    receipt: String,
    products: [{ type: Schema.Types.ObjectId, ref: 'Product' }]
  }, invoiceOpts)

  var Account = new Schema({
    accountNumber: String,
    points: Number
  })

  function initialize (callback) {
    if (!mongoose.models.Customer) {
      mongoose.model('Customer', Customer)
    }

    if (!mongoose.models.Invoice) {
      mongoose.model('Invoice', Invoice)
    }

    if (!mongoose.models.Product) {
      mongoose.model('Product', Product)
    }

    if (!mongoose.models.RepeatCustomer) {
      mongoose.models.Customer.discriminator('RepeatCustomer', RepeatCustomer)
    }

    if (!mongoose.models.Account) {
      mongoose.model('Account', Account)
    }

    mongoose.connect('mongodb://localhost/database', callback)
  }

  function reset (callback) {
    async.series([
      function (cb) {
        mongoose.models.Customer.remove(cb)
      },
      function (cb) {
        mongoose.models.Invoice.remove(cb)
      },
      function (cb) {
        mongoose.models.Product.remove(cb)
      },
      function (cb) {
        mongoose.models.RepeatCustomer.remove(cb)
      },
      function (cb) {
        mongoose.models.Account.remove(cb)
      }
    ], callback)
  }

  function close (callback) {
    mongoose.connection.close(callback)
  }

  return {
    initialize: initialize,
    models: mongoose.models,
    reset: reset,
    close: close
  }
}
