/**
 * This program has been developed by students from the bachelor Computer Science at Utrecht University within the Software Project course.
 * © Copyright Utrecht University (Department of Information and Computing Sciences)
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import express from "express";
import logger from "morgan";
import * as path from "path";

import { errorHandler, errorNotFoundHandler } from "./middlewares/errorHandler";
import { api } from "./routes/api";

import cors from "cors";

// Routes
import { index } from "./routes/index";
import { errors } from "celebrate";
// Create Express server
export const app = express();

app.use(express.json());
app.use(cors());

// Express configuration
app.set("port", process.env.PORT || 43210);
// app.set("views", path.join(__dirname, "../views"));
// app.set("view engine", "pug");

app.use(logger("dev"));

// app.use(express.static(path.join(__dirname, "../public")));
app.use("/", index);
app.use("/verification_api", api);

app.use(errors());
app.use(errorNotFoundHandler);
app.use(errorHandler);

console.log("ENVIRONMENT: %s", app.get("env"));
