/**
  * This program has been developed by students from the bachelor Computer Science at Utrecht University within the Software Project course.
  * © Copyright Utrecht University (Department of Information and Computing Sciences)
  *
  * This source code is licensed under the MIT license found in the
  * LICENSE file in the root directory of this source tree.
  */

import { NextFunction, Request, Response } from "express";
import createError from "http-errors";

declare type WebError = Error & { status?: number };
export const errorHandler = (
    err: WebError,
    req: Request,
    res: Response,
    next: NextFunction,
): void => {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get("env") === "development" ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.json({ ok: false, error: err.name, message: err.message });
};

export const errorNotFoundHandler = (
    req: Request,
    res: Response,
    next: NextFunction,
): void => {
    next(createError(404));
};