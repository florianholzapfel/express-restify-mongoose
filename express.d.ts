import type { Document, Model } from "mongoose";
import type { QueryOptions } from "./src/getQuerySchema";
import type { Access } from "./src/types";

declare global {
  namespace Express {
    export interface Request {
      access: Access;
      erm: {
        document?: Document;
        model?: Model<unknown>;
        query?: QueryOptions;
        result?: Record<string, unknown> | Record<string, unknown>[];
        statusCode?: number;
        totalCount?: number;
      };
    }
  }
}
