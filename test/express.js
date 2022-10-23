import bodyParser from "body-parser";
import express from "express";
import methodOverride from "method-override";

import accessTests from "./integration/access";
import contextFilterTests from "./integration/contextFilter";
import createTests from "./integration/create";
import deleteTests from "./integration/delete";
import hookTests from "./integration/hooks";
import middlewareTests from "./integration/middleware";
import optionsTests from "./integration/options";
import readTests from "./integration/read";
import updateTests from "./integration/update";
import virtualsTests from "./integration/virtuals";

import setupDb from "./integration/setup";

const db = setupDb();

function Express() {
  let app = express();
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(methodOverride());
  return app;
}

function setup(callback) {
  db.initialize((err) => {
    if (err) {
      return callback(err);
    }

    db.reset(callback);
  });
}

function dismantle(app, server, callback) {
  db.close((err) => {
    if (err) {
      return callback(err);
    }

    if (app.close) {
      return app.close(callback);
    }

    server.close(callback);
  });
}

function runTests(createFn) {
  describe(createFn.name, () => {
    createTests(createFn, setup, dismantle);
    readTests(createFn, setup, dismantle);
    updateTests(createFn, setup, dismantle);
    deleteTests(createFn, setup, dismantle);
    accessTests(createFn, setup, dismantle);
    contextFilterTests(createFn, setup, dismantle);
    hookTests(createFn, setup, dismantle);
    middlewareTests(createFn, setup, dismantle);
    optionsTests(createFn, setup, dismantle);
    virtualsTests(createFn, setup, dismantle);
  });
}

runTests(Express);
