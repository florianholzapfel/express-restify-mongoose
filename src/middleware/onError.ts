import { ErrorRequestHandler } from "express";
import { serializeError } from "serialize-error";

// Properties that hold an underlying error (mongoose's `CastError.reason`,
// `Error.cause`) or a stack trace. They describe the server, not the request,
// so they never go to the client.
const INTERNAL_KEYS = ["stack", "reason", "cause"];

function stripInternals(serializedErr: Record<string, unknown>) {
  for (const key of INTERNAL_KEYS) {
    delete serializedErr[key];
  }
}

// Whether a stack is emitted for a nested error depends on the version of
// serialize-error, so remove any that is left, at any depth.
function stripStacks(value: unknown, seen = new WeakSet<object>()) {
  if (typeof value !== "object" || value === null || seen.has(value)) {
    return;
  }

  seen.add(value);

  const obj = value as Record<string, unknown>;

  for (const key of Object.keys(obj)) {
    if (key === "stack" && typeof obj[key] === "string") {
      delete obj[key];
    } else {
      stripStacks(obj[key], seen);
    }
  }
}

export function getOnErrorHandler(isExpress: boolean) {
  const fn: ErrorRequestHandler = function onError(err, req, res) {
    const serializedErr = serializeError(err);

    stripInternals(serializedErr);

    if (serializedErr.errors) {
      for (const key in serializedErr.errors) {
        const nested = serializedErr.errors[key];

        if (typeof nested === "object" && nested !== null) {
          stripInternals(nested);
        }
      }
    }

    stripStacks(serializedErr);

    res.setHeader("Content-Type", "application/json");

    if (isExpress) {
      res.status(req.erm.statusCode || 500).send(serializedErr);
    } else {
      // @ts-expect-error restify
      res.send(req.erm.statusCode, serializedErr);
    }
  };

  return fn;
}
