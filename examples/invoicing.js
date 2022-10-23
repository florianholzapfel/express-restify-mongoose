import bodyParser from "body-parser";
import express from "express";
import http from "http";
import methodOverride from "method-override";
import mongoose from "mongoose";
import { serve } from "../src/express-restify-mongoose";

mongoose.connect("mongodb://localhost/database", {
  useMongoClient: true,
});

const Customer = new mongoose.Schema({
  name: { type: String, required: true },
  comment: { type: String },
});

const CustomerModel = mongoose.model("Customer", Customer);

const Invoice = new mongoose.Schema({
  customer: { type: Schema.Types.ObjectId, ref: "Customer" },
  amount: { type: Number, required: true },
});

const InvoiceModel = mongoose.model("Invoice", Invoice);

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(methodOverride("X-HTTP-Method-Override"));

serve(app, CustomerModel);
serve(app, InvoiceModel);

http.createServer(app).listen(3000, function () {
  console.log("Express server listening on port 3000");
});
