import express from "express";
import { validateBody } from "../middlewares/validateBody.js";
import {
  signInUserSchema,
  signUpUserSchema,
  verifyCodeSchema,
  walletSignInSchema,
} from "../schemaValidation/auth.schema.js";
import {
  getUserInfoWithWallet,
  sendVerificationEmailController,
  signIn,
  signUp,
  verifyCode,
  walletSignIn,
} from "../controllers/auth.controllers.js";
import { userAuth } from "../middlewares/authentication.js";

const router = express.Router();

// User sign-up
router.post("/sign-up", validateBody(signUpUserSchema), signUp);

// User sign-in
router.post("/sign-in", validateBody(signInUserSchema), signIn);


// Wallet-based sign-in
router.post("/wallet-sign-in", validateBody(walletSignInSchema), walletSignIn);
// Email verification for 2FA

router.get("/user-info", userAuth,getUserInfoWithWallet);

router.post("/verify-code", userAuth,validateBody(verifyCodeSchema), verifyCode);
router.post(
  "/send-verification-email",
  userAuth,
  sendVerificationEmailController
);

export default router;
