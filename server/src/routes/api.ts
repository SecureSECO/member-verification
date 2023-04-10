/**
  * This program has been developed by students from the bachelor Computer Science at Utrecht University within the Software Project course.
  * © Copyright Utrecht University (Department of Information and Computing Sciences)
  *
  * This source code is licensed under the MIT license found in the
  * LICENSE file in the root directory of this source tree.
  */

import { celebrate, Joi } from "celebrate";
import { Router } from "express";
import * as controller from "../controllers/api";

export const api = Router();

api.get("/", controller.index);

api.post(
    "/verify",
    celebrate({
        body: {
            address: Joi.string()
                .pattern(/^0x[a-fA-F0-9]{40}$/)
                .required(),
            signature: Joi.string().max(1000).required(),
            nonce: Joi.string().max(100).required(),
            providerId: Joi.string().max(100).required(),
        },
    }),
    controller.authorize,
);
api.get("/github_callback", controller.githubCallback);