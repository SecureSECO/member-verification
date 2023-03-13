import { celebrate, Joi } from "celebrate";
import { Router } from "express";
import * as controller from "../controllers/api";

export const api = Router();

api.get("/", controller.index);

// api.get("/verify", controller.verify);
api.get("/isVerified", controller.isVerified);
api.post(
    "/verify",
    celebrate({
        body: {
            address: Joi.string()
                .pattern(/^0x[a-fA-F0-9]{40}$/)
                .required(),
            signature: Joi.string().max(1000).required(),
            nonce: Joi.string().max(100).required(),
        },
    }),
    controller.authorize,
);
api.get("/github_callback", controller.githubCallback);
