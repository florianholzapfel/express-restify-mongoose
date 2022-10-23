import assert from "assert";
import request from "request";
import { serve } from "../../src/express-restify-mongoose";

import setupDb from "./setup";

module.exports = function (createFn, setup, dismantle) {
  const db = setupDb();

  const testPort = 30023;
  const testUrl = `http://localhost:${testPort}`;

  describe("virtuals", () => {
    describe("lean: true", () => {
      let app = createFn();
      let server;

      beforeEach((done) => {
        setup((err) => {
          if (err) {
            return done(err);
          }

          serve(app, db.models.Customer, {
            lean: true,
            restify: app.isRestify,
          });

          db.models.Customer.create({
            name: "Bob",
          })
            .then((createdCustomers) => {
              server = app.listen(testPort, done);
            })
            .catch(done);
        });
      });

      afterEach((done) => {
        dismantle(app, server, done);
      });

      it("GET /Customer 200 - unavailable", (done) => {
        request.get(
          {
            url: `${testUrl}/api/v1/Customer`,
            json: true,
          },
          (err, res, body) => {
            assert.ok(!err);
            assert.equal(res.statusCode, 200);
            assert.equal(body.length, 1);
            assert.equal(body[0].info, undefined);
            done();
          }
        );
      });
    });

    describe("lean: false", () => {
      let app = createFn();
      let server;

      beforeEach((done) => {
        setup((err) => {
          if (err) {
            return done(err);
          }

          serve(app, db.models.Customer, {
            lean: false,
            restify: app.isRestify,
          });

          db.models.Customer.create({
            name: "Bob",
          })
            .then((createdCustomers) => {
              server = app.listen(testPort, done);
            })
            .catch(done);
        });
      });

      afterEach((done) => {
        dismantle(app, server, done);
      });

      it("GET /Customer 200 - available", (done) => {
        request.get(
          {
            url: `${testUrl}/api/v1/Customer`,
            json: true,
          },
          (err, res, body) => {
            assert.ok(!err);
            assert.equal(res.statusCode, 200);
            assert.equal(body.length, 1);
            assert.equal(body[0].info, "Bob is awesome");
            done();
          }
        );
      });
    });

    describe("readPreference: secondary", () => {
      let app = createFn();
      let server;

      beforeEach((done) => {
        setup((err) => {
          if (err) {
            return done(err);
          }

          serve(app, db.models.Customer, {
            readPreference: "secondary",
            restify: app.isRestify,
          });

          db.models.Customer.create({
            name: "Bob",
          })
            .then((createdCustomers) => {
              server = app.listen(testPort, done);
            })
            .catch(done);
        });
      });

      afterEach((done) => {
        dismantle(app, server, done);
      });

      it("GET /Customer 200 - available", (done) => {
        request.get(
          {
            url: `${testUrl}/api/v1/Customer`,
            json: true,
          },
          (err, res, body) => {
            assert.ok(!err);
            assert.equal(res.statusCode, 200);
            done();
          }
        );
      });
    });
  });
};
