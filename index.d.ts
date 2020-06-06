// Type definitions for express-restify-mongoose 3.2.0
// Project: https://github.com/florianholzapfel/express-restify-mongoose
// Definitions by: pedroraft <https://github.com/pedroraft> & ravishivt <https://github.com/ravishivt>
// Definitions: https://github.com/florianholzapfel/express-restify-mongoose
// TypeScript Version: 2.5.3

///<reference types="express" />
///<reference types="mongoose" />

// DOCS: https://florianholzapfel.github.io/express-restify-mongoose/
declare module 'express-restify-mongoose' {
    import * as express from 'express';
    import * as mongoose from 'mongoose';

    export interface Options {
        prefix?: string;
        version?: string;
        idProperty?: string;
        restify?: boolean;
        plural?: boolean;
        lowercase?: boolean;
        name?: string;
        private?: string[];
        protected?: string[];
        lean?: boolean;
        findOneAndUpdate?: boolean;
        preMiddleware?: (req: express.Request, res: express.Response, next: express.NextFunction) => any;
        preCreate?: (req: express.Request, res: express.Response, next: express.NextFunction) => any;
        preRead?: (req: express.Request, res: express.Response, next: express.NextFunction) => any;
        preUpdate?: (req: express.Request, res: express.Response, next: express.NextFunction) => any;
        preDelete?: (req: express.Request, res: express.Response, next: express.NextFunction) => any;
        access?: (req: express.Request, done?: any) => any;
        contextFilter?: (model: mongoose.Model<any>, req: express.Request, done: any) => any;
        postCreate?: (req: express.Request, res: express.Response, next: express.NextFunction) => any;
        postRead?: (req: express.Request, res: express.Response, next: express.NextFunction) => any;
        postUpdate?: (req: express.Request, res: express.Response, next: express.NextFunction) => any;
        postDelete?: (req: express.Request, res: express.Response, next: express.NextFunction) => any;
        outputFn?: (req: express.Request, res: express.Response) => any;
        onError?: (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => any;
    }

    export function serve(router: express.Router, mongooseModel: mongoose.Model<any>, options?: Options): string;

    export function defaults(options: Options): void;
}
