import {
  ErrorRequestHandler,
  Request,
  RequestHandler,
  Response,
} from "express";
import mongoose from "mongoose";

export type Access = "private" | "protected" | "public";

export type FilteredKeys = {
  private: string[];
  protected: string[];
};

export type ExcludedMap = Record<string, FilteredKeys>;

export type OutputFn = (req: Request, res: Response) => void | Promise<void>;

export type ReadPreference =
  | "p"
  | "primary"
  | "pp"
  | "primaryPreferred"
  | "s"
  | "secondary"
  | "sp"
  | "secondaryPreferred"
  | "n"
  | "nearest";

export type Options = {
  prefix: `/${string}`;
  version: `/v${number}`;
  idProperty: string;
  restify: boolean;
  name?: string;
  allowRegex: boolean;
  runValidators: boolean;
  readPreference: ReadPreference;
  totalCountHeader: boolean | string;
  private: string[];
  protected: string[];
  lean: boolean;
  limit?: number;
  findOneAndRemove: boolean;
  findOneAndUpdate: boolean;
  upsert: boolean;
  preMiddleware: RequestHandler | RequestHandler[];
  preCreate: RequestHandler | RequestHandler[];
  preRead: RequestHandler | RequestHandler[];
  preUpdate: RequestHandler | RequestHandler[];
  preDelete: RequestHandler | RequestHandler[];
  access?: (req: Request) => Access | Promise<Access>;
  contextFilter: (
    model: mongoose.Model<unknown>,
    req: Request,
    done: (
      query: mongoose.Model<unknown> | mongoose.Query<unknown, unknown>
    ) => void
  ) => void;
  postCreate?: RequestHandler | RequestHandler[];
  postRead?: RequestHandler | RequestHandler[];
  postUpdate?: RequestHandler | RequestHandler[];
  postDelete?: RequestHandler | RequestHandler[];
  outputFn: OutputFn;
  postProcess?: (req: Request, res: Response) => void;
  onError: ErrorRequestHandler;
  modelFactory?: {
    getModel: (req: Request) => mongoose.Model<unknown>;
  };
};
