import mongoose from "mongoose";
import { Access } from "./src/express-restify-mongoose";

declare global {
  namespace Express {
    export interface Request {
      access: Access;
      erm: {
        document?: mongoose.Document;
        model?: mongoose.Model<unknown>;
        query?: {
          distinct?: unknown;
          populate: { path: string; select?: string }[];
          select: Record<string, unknown>;
        };
        result?: Record<string, unknown> | Record<string, unknown>[];
        statusCode?: number;
        totalCount?: number;
      };
    }
  }
}
