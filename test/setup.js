/* global before, after */
'use strict'

var mongoose = require('mongoose')
var Schema = mongoose.Schema
var util = require('util')
var assert = require('assertmessage')

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
  products: [{ type: Schema.Types.ObjectId, ref: 'Product' }]
}, invoiceOpts)

var Account = new Schema({
  accountNumber: String,
  points: Number
})

var setup = module.exports = function () {
  if (!setup.CustomerModel) {
    setup.CustomerModel = mongoose.model('Customer', Customer)
  }
  if (!setup.InvoiceModel) {
    setup.InvoiceModel = mongoose.model('Invoice', Invoice)
  }
  if (!setup.ProductModel) {
    setup.ProductModel = mongoose.model('Product', Product)
  }
  if (!setup.RepeatCustomerModel) {
    setup.RepeatCustomerModel =
      setup.CustomerModel.discriminator('RepeatCustomer', RepeatCustomer)
  }
  if (!setup.AccountModel) {
    setup.AccountModel = mongoose.model('Account', Account)
  }

  before(function (done) {
    mongoose.connect('mongodb://localhost/database', function (err) {
      assert(!err, err)
      setup.CustomerModel.remove(function (err) {
        assert(!err, err)
        setup.InvoiceModel.remove(function (err) {
          assert(!err, err)
          setup.ProductModel.remove(function (err) {
            assert(!err, err)
            setup.RepeatCustomerModel.remove(function (err) {
              assert(!err, err)
              setup.AccountModel.remove(done)
            })
          })
        })
      })
    })
  })

  after(function (done) {
    mongoose.connection.close(done)
  })
}
