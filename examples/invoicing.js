var http = require("http");
var express = require("express");
var bodyParser = require("body-parser");
var methodOverride = require("method-override");
var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var restify = require("..");

mongoose.connect("mongodb://localhost/database", {
  useMongoClient: true,
});

var Customer = new Schema({
  name: { type: String, required: true },
  comment: { type: String },
});
var CustomerModel = mongoose.model("Customer", Customer);

var Invoice = new Schema({
  customer: { type: Schema.Types.ObjectId, ref: "Customer" },
  amount: { type: Number, required: true },
});
var InvoiceModel = mongoose.model("Invoice", Invoice);

var app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(methodOverride("X-HTTP-Method-Override"));
restify.serve(app, CustomerModel);
restify.serve(app, InvoiceModel);

http.createServer(app).listen(3000, function () {
  console.log("Express server listening on port 3000");
});
