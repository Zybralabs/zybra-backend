import express from "express";
import {
  getUserProfile,
  updateUserProfile,
  submitKYC,
  getKYCStatus,
  executeTransaction,
  createAbstractWallet,
  addWallet,
  getWallets,
  addTransaction,
  getTransactions,
  getTotalInvestment,
  getUserAssetsAndPoolsHoldings,
} from "../controllers/user.controllers.js";
import { userAuth } from "../middlewares/authentication.js";

const router = express.Router();

// --------------------- USER ROUTES ---------------------

// Get user profile
router.get("/profile",userAuth, getUserProfile);

// Update user profile
router.put("/profile",userAuth, updateUserProfile);

// --------------------- KYC ROUTES ---------------------

// Submit KYC details
router.post("/kyc",userAuth, submitKYC);

// Get KYC status
router.get("/kyc",userAuth, getKYCStatus);

// --------------------- WALLET ROUTES ---------------------

// Add a wallet
router.post("/wallet",userAuth, addWallet);

// Get all wallets for a user
router.get("/wallets",userAuth, getWallets);

// Create an abstract wallet
router.post("/wallet/abstract", createAbstractWallet);

// --------------------- TRANSACTION ROUTES ---------------------

// Execute a transaction
router.post("/transaction/execute",userAuth, executeTransaction);

// Add a manual transaction (optional use case)
router.post("/transaction", userAuth, addTransaction);

// Get all transactions for a user (filter by wallet optional)
router.get("/transactions", getTransactions);

// Get total investment in USD for a user
router.get("/investments/total", userAuth,getTotalInvestment);

// Get user assets and pools holdings
router.get("/holdings", userAuth,getUserAssetsAndPoolsHoldings);

export default router;
