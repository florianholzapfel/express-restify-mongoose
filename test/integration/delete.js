import assert from "assert";
import mongoose from "mongoose";
import request from "request";
import { serve } from "../../src/express-restify-mongoose";

import setupDb from "./setup";

module.exports = function (createFn, setup, dismantle) {
  const db = setupDb();

  const testPort = 30023;
  const testUrl = `http://localhost:${testPort}`;
  const invalidId = "invalid-id";
  const randomId = new mongoose.Types.ObjectId().toHexString();

  describe("Delete documents", () => {
    describe("findOneAndRemove: true", () => {
      let app = createFn();
      let server;
      let customer;

      before((done) => {
        setup((err) => {
          if (err) {
            return done(err);
          }

          serve(app, db.models.Customer, {
            findOneAndRemove: true,
            restify: app.isRestify,
          });

          server = app.listen(testPort, done);
        });
      });

      beforeEach((done) => {
        db.reset((err) => {
          if (err) {
            return done(err);
          }

          db.models.Customer.create([
            {
              name: "Bob",
            },
            {
              name: "John",
            },
            {
              name: "Mike",
            },
          ])
            .then((createdCustomers) => {
              customer = createdCustomers[0];
            })
            .then(done)
            .catch(done);
        });
      });

      after((done) => {
        dismantle(app, server, done);
      });

      it("DELETE /Customer 204 - no id", (done) => {
        request.del(
          {
            url: `${testUrl}/api/v1/Customer`,
          },
          (err, res) => {
            assert.ok(!err);
            assert.equal(res.statusCode, 204);
            done();
          }
        );
      });

      it("DELETE /Customer/:id 204 - created id", (done) => {
        request.del(
          {
            url: `${testUrl}/api/v1/Customer/${customer._id}`,
          },
          (err, res) => {
            assert.ok(!err);
            assert.equal(res.statusCode, 204);
            done();
          }
        );
      });

      it("DELETE /Customer/:id 404 - invalid id", (done) => {
        request.del(
          {
            url: `${testUrl}/api/v1/Customer/${invalidId}`,
          },
          (err, res) => {
            assert.ok(!err);
            assert.equal(res.statusCode, 404);
            done();
          }
        );
      });

      it("DELETE /Customer/:id 404 - random id", (done) => {
        request.del(
          {
            url: `${testUrl}/api/v1/Customer/${randomId}`,
          },
          (err, res) => {
            assert.ok(!err);
            assert.equal(res.statusCode, 404);
            done();
          }
        );
      });

      it('DELETE /Customer?query={"name":"John"} 200 - exact match', (done) => {
        request.del(
          {
            url: `${testUrl}/api/v1/Customer`,
            qs: {
              query: JSON.stringify({
                name: "John",
              }),
            },
            json: true,
          },
          (err, res) => {
            assert.ok(!err);
            assert.equal(res.statusCode, 204);

            db.models.Customer.find({}, (err, customers) => {
              assert.ok(!err);
              assert.equal(customers.length, 2);
              customers.forEach((customer) => {
                assert.ok(customer.name !== "John");
              });
              done();
            });
          }
        );
      });
    });

    describe("findOneAndRemove: false", () => {
      let app = createFn();
      let server;
      let customer;

      before((done) => {
        setup((err) => {
          if (err) {
            return done(err);
          }

          serve(app, db.models.Customer, {
            findOneAndRemove: false,
            restify: app.isRestify,
          });

          server = app.listen(testPort, done);
        });
      });

      beforeEach((done) => {
        db.reset((err) => {
          if (err) {
            return done(err);
          }

          db.models.Customer.create([
            {
              name: "Bob",
            },
            {
              name: "John",
            },
            {
              name: "Mike",
            },
          ])
            .then((createdCustomers) => {
              customer = createdCustomers[0];
            })
            .then(done)
            .catch(done);
        });
      });

      after((done) => {
        dismantle(app, server, done);
      });

      it("DELETE /Customer 204 - no id", (done) => {
        request.del(
          {
            url: `${testUrl}/api/v1/Customer`,
          },
          (err, res) => {
            assert.ok(!err);
            assert.equal(res.statusCode, 204);
            done();
          }
        );
      });

      it("DELETE /Customer/:id 204 - created id", (done) => {
        request.del(
          {
            url: `${testUrl}/api/v1/Customer/${customer._id}`,
          },
          (err, res) => {
            assert.ok(!err);
            assert.equal(res.statusCode, 204);
            done();
          }
        );
      });

      it("DELETE /Customer/:id 404 - invalid id", (done) => {
        request.del(
          {
            url: `${testUrl}/api/v1/Customer/${invalidId}`,
          },
          (err, res) => {
            assert.ok(!err);
            assert.equal(res.statusCode, 404);
            done();
          }
        );
      });

      it("DELETE /Customer/:id 404 - random id", (done) => {
        request.del(
          {
            url: `${testUrl}/api/v1/Customer/${randomId}`,
          },
          (err, res) => {
            assert.ok(!err);
            assert.equal(res.statusCode, 404);
            done();
          }
        );
      });

      it('DELETE /Customer?query={"name":"John"} 200 - exact match', (done) => {
        request.del(
          {
            url: `${testUrl}/api/v1/Customer`,
            qs: {
              query: JSON.stringify({
                name: "John",
              }),
            },
            json: true,
          },
          (err, res) => {
            assert.ok(!err);
            assert.equal(res.statusCode, 204);

            db.models.Customer.find({}, (err, customers) => {
              assert.ok(!err);
              assert.equal(customers.length, 2);
              customers.forEach((customer) => {
                assert.ok(customer.name !== "John");
              });
              done();
            });
          }
        );
      });
    });
  });
};
