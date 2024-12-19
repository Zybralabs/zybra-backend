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

const router = express.Router();

// --------------------- USER ROUTES ---------------------

// Get user profile
router.get("/profile", getUserProfile);

// Update user profile
router.put("/profile", updateUserProfile);

// --------------------- KYC ROUTES ---------------------

// Submit KYC details
router.post("/kyc", submitKYC);

// Get KYC status
router.get("/kyc", getKYCStatus);

// --------------------- WALLET ROUTES ---------------------

// Add a wallet
router.post("/wallet", addWallet);

// Get all wallets for a user
router.get("/wallets", getWallets);

// Create an abstract wallet
router.post("/wallet/abstract", createAbstractWallet);

// --------------------- TRANSACTION ROUTES ---------------------

// Execute a transaction
router.post("/transaction/execute", executeTransaction);

// Add a manual transaction (optional use case)
router.post("/transaction", addTransaction);

// Get all transactions for a user (filter by wallet optional)
router.get("/transactions", getTransactions);

// Get total investment in USD for a user
router.get("/investments/total", getTotalInvestment);

// Get user assets and pools holdings
router.get("/holdings", getUserAssetsAndPoolsHoldings);

export default router;
