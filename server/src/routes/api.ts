import { Router } from "express";
import * as controller from "../controllers/api";

export const api = Router();

api.get("/", controller.index);
