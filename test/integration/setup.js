var async = require('async')
var mongoose = require('mongoose')
var Schema = mongoose.Schema
var util = require('util')

module.exports = function () {
  var ProductSchema = new Schema({
    name: { type: String, required: true },
    department: {
      name: { type: String },
      code: { type: Number }
    },
    price: { type: Number }
  })

  var PurchaseSchema = new Schema({
    item: { type: Schema.Types.ObjectId, ref: 'Product' },
    number: { type: Number }
  })

  var FavoritesSchema = new Schema({
    animal: { type: String },
    color: { type: String },
    purchase: PurchaseSchema
  })

  var BaseCustomerSchema = function () {
    Schema.apply(this, arguments)

    this.add({
      account: { type: Schema.Types.ObjectId, ref: 'Account' },
      name: { type: String, required: true, unique: true },
      comment: { type: String },
      address: { type: String },
      age: { type: Number },
      favorites: FavoritesSchema,
      purchases: [{
        item: { type: Schema.Types.ObjectId, ref: 'Product' },
        number: { type: Number }
      }],
      returns: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
      creditCard: { type: String, access: 'protected' },
      ssn: { type: String, access: 'private' }
    })
  }

  util.inherits(BaseCustomerSchema, Schema)

  var CustomerSchema = new BaseCustomerSchema({}, {
    toObject: { virtuals: true },
    toJSON: { virtuals: true }
  })

  CustomerSchema.virtual('info').get(function () {
    return this.name + ' is awesome'
  })

  var InvoiceSchema = new Schema({
    customer: { type: Schema.Types.ObjectId, ref: 'Customer' },
    amount: { type: Number },
    receipt: { type: String },
    products: [{ type: Schema.Types.ObjectId, ref: 'Product' }]
  }, {
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
    versionKey: '__version'
  })

  var RepeatCustomerSchema = new BaseCustomerSchema({
    account: { type: Schema.Types.ObjectId, ref: 'Account' },
    visits: { type: Number },
    status: { type: String },
    job: { type: String }
  })

  var AccountSchema = new Schema({
    accountNumber: String,
    points: Number
  })

  function initialize (callback) {
    if (!mongoose.models.Customer) {
      mongoose.model('Customer', CustomerSchema)
    }

    if (!mongoose.models.Invoice) {
      mongoose.model('Invoice', InvoiceSchema)
    }

    if (!mongoose.models.Product) {
      mongoose.model('Product', ProductSchema)
    }

    if (!mongoose.models.RepeatCustomer) {
      mongoose.models.Customer.discriminator('RepeatCustomer', RepeatCustomerSchema)
    }

    if (!mongoose.models.Account) {
      mongoose.model('Account', AccountSchema)
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
