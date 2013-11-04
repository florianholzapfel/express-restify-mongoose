var mongoose = require('mongoose'),
    Schema   = mongoose.Schema;

var assert = require('assertmessage');
var opts = {
    toObject: { virtuals: true },
    toJSON: { virtuals: true }
};

var Customer = new Schema({
    name: { type: String, required: true },
    comment: { type: String }
}, opts);
var Invoice = new Schema({
    customer: { type: Schema.Types.ObjectId, ref: 'Customer' },
    amount: { type: Number }
}, {
    versionKey: '__version'
}, opts);

Customer.virtual('info').get(function () {
    return this.name + ' is awesome';
});

var setup = module.exports = function () {
    var self = this;

    if (setup.customerModel) {
        setup.customerModel = mongoose.model('Customer', Customer);
    }
    if (setup.invoiceModel) {
        setup.invoiceModel = mongoose.model('Invoice', Invoice);
    }

    before(function (done) {
        mongoose.connect('mongodb://localhost/database', function (err) {
            assert(!err, err);
            setup.customerModel.remove(function (err) {
                assert(!err, err);
                setup.invoiceModel.remove(done);
            });
        });
    });

    after(function (done) {
        mongoose.connection.close(done);
    });
};

setup.customerModel = {};
setup.invoiceModel = {};
