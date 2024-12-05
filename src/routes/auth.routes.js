import express from "express";
import { validateBody } from "../middlewares/validateBody.js";
import {
  signInUserSchema,
  signUpUserSchema,
  verifyCodeSchema,
  walletSignInSchema,
} from "../schemaValidation/auth.schema.js";
import {
  signIn,
  signUp,
  verifyCode,
  walletSignIn,
} from "../controllers/auth.controllers.js";

const router = express.Router();

// User sign-up
router.post("/sign-up", validateBody(signUpUserSchema), signUp);

// User sign-in
router.post("/sign-in", validateBody(signInUserSchema), signIn);

// Email verification for 2FA
router.post("/verify-code", validateBody(verifyCodeSchema), verifyCode);

// Wallet-based sign-in
router.post("/wallet-sign-in", validateBody(walletSignInSchema), walletSignIn);

router.post(
  "/send-verification-email",
  validateBody(emailVerificationSchema), // Ensure the email is valid
  sendVerificationEmailController
);

export default router;
