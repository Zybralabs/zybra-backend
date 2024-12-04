import express from "express";
import { validateBody } from "../middlewares/validateBody.js";
import {
  signInUserSchema,
  signUpUserSchema,
} from "../schemaValidation/auth.schema.js";
import { signIn, signUp } from "../controllers/auth.controllers.js";
import { userAuth } from "../middlewares/authentication.js";

const router = express.Router();

router.post("/sign-up", validateBody(signUpUserSchema), signUp);
router.post("/sign-in", validateBody(signInUserSchema), signIn);

export default router;
