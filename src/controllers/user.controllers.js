// MongoDB Models
import { User } from "../models/User.js";
import { Token } from "../models/Token.js";
import { Wallet } from "../models/Wallet.js";
import { Transaction } from "../models/Transaction.js";

import { ethers } from "ethers";
import HelperConfig from "../utils/HelperConfig.js"; // Assume HelperConfig is converted to a JavaScript/JSON format



// utils
import { generateController } from "../utils/generateController.js";
import { generateAccessToken } from "../utils/generateAccessToken.js";

// bcrypt for password hashing
import bcrypt from "bcrypt";
import { deployMinimalAccount, initializeBlockchain } from "../utils/abstractWalletUtils.js";

// -----------------------------------------------
// USERS
// -----------------------------------------------

// Fetch User Profile
const getUserProfile = generateController(async (req, res, raiseException) => {
  const { userId } = req.query;

  if (!userId) {
    return raiseException(400, "User ID is required");
  }

  const user = await User.findById(userId)
    .populate("wallets") // Populate wallets
    .exec();

  if (!user) {
    return raiseException(404, "User not found");
  }

  res.status(200).json({
    message: "User profile retrieved successfully",
    payload: user,
    success: true,
  });
});

// Update User Profile
const updateUserProfile = generateController(
  async (req, res, raiseException) => {
    const { userId, first_name, last_name, profile_details } = req.body;

    if (!userId) {
      return raiseException(400, "User ID is required");
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { first_name, last_name, profile_details },
      { new: true }
    ).exec();

    if (!updatedUser) {
      return raiseException(404, "User not found");
    }

    res.status(200).json({
      message: "User profile updated successfully",
      payload: updatedUser,
      success: true,
    });
  }
);

// -----------------------------------------------
// KYC
// -----------------------------------------------

// Submit KYC Details
const submitKYC = generateController(async (req, res, raiseException) => {
  const { userId, document_type, document_number, document_image } = req.body;

  if (!userId || !document_type || !document_number || !document_image) {
    return raiseException(400, "Missing required KYC fields");
  }

  const user = await User.findByIdAndUpdate(
    userId,
    {
      kyc_details: {
        document_type,
        document_number,
        document_image,
        submitted_at: new Date(),
      },
      kyc_status: "pending",
    },
    { new: true }
  ).exec();

  if (!user) {
    return raiseException(404, "User not found");
  }

  res.status(200).json({
    message: "KYC submitted successfully",
    payload: user,
    success: true,
  });
});

// Get KYC Status
const getKYCStatus = generateController(async (req, res, raiseException) => {
  const { userId } = req.query;

  if (!userId) {
    return raiseException(400, "User ID is required");
  }

  const user = await User.findById(userId)
    .select("kyc_status kyc_details")
    .exec();

  if (!user) {
    return raiseException(404, "User not found");
  }

  res.status(200).json({
    message: "KYC status retrieved successfully",
    payload: user,
    success: true,
  });
});

// -----------------------------------------------
// WALLETS
// -----------------------------------------------

// Add Wallet
const addWallet = generateController(async (req, res, raiseException) => {
  const { userId, walletAddress } = req.body;

  if (!userId || !walletAddress) {
    return raiseException(400, "Missing required wallet fields");
  }

  // Check if the wallet already exists
  const existingWallet = await Wallet.findOne({ address: walletAddress }).exec();
  if (existingWallet) {
    return raiseException(409, "Wallet already exists");
  }

  const wallet = await Wallet.create({
    user: userId,
    address: walletAddress,
    wallet_type: "web3-wallet",
  });

  if (!wallet) {
    return raiseException(500, "Failed to add wallet");
  }

  // Update the user's wallet reference
  await User.findByIdAndUpdate(userId, { $push: { wallets: wallet._id } });

  res.status(201).json({
    message: "Wallet added successfully",
    payload: wallet,
    success: true,
  });
});



const createAbstractWallet = generateController(async (req, res, raiseException) => {
  const { userId } = req.body;

  if (!userId) {
    return raiseException(400, "User ID is required");
  }

  // Check if the user exists
  const user = await User.findById(userId).exec();
  if (!user) {
    return raiseException(404, "User not found");
  }

  try {
    // Initialize blockchain
    const { signer, config } = initializeBlockchain();

    // Deploy the MinimalAccount contract
    const minimalAccountAddress = await deployMinimalAccount(signer, config.entryPoint);

    console.log(`MinimalAccount deployed at: ${minimalAccountAddress}`);

    // Save the wallet to the database
    const walletRecord = await Wallet.create({
      user: userId,
      address: minimalAccountAddress,
      wallet_type: "abstraction-wallet",
    });

    // Update the user's profile with the new wallet
    await User.findByIdAndUpdate(userId, { $push: { wallets: walletRecord._id } });

    res.status(201).json({
      message: "Abstract wallet created and linked to user successfully",
      payload: walletRecord,
      success: true,
    });
  } catch (err) {
    console.error("Error creating abstract wallet:", err);
    raiseException(500, "Failed to create an abstract wallet");
  }
});


const executeTransaction = generateController(async (req, res, raiseException) => {
    const { userId, walletId, dest, calldata, asset, amount } = req.body;
  
    if (!userId || !walletId || !dest || !calldata || !asset || !amount) {
      return raiseException(400, "Missing required fields");
    }
  
    // Find the user's wallet
    const wallet = await Wallet.findOne({ _id: walletId, user: userId }).exec();
    if (!wallet) {
      return raiseException(404, "Wallet not found");
    }
  
    try {
      // Execute the transaction via generateAndExecuteUserOperation
      const receipt = await generateAndExecuteUserOperation(
        wallet.address,
        dest,
        calldata,
        wallet.address // Assume wallet pays for its operations
      );
  
      console.log("Transaction executed successfully:", receipt);
  
      // Record the transaction in the database
      const transactionRecord = await Transaction.create({
        user: userId,
        wallet: walletId,
        type: "custom", // Replace with specific type if applicable
        asset,
        amount,
        status: "completed",
        metadata: {
          dest,
          calldata,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed.toString(),
        },
        tx_hash: receipt.transactionHash,
      });
  
      res.status(200).json({
        message: "Transaction executed successfully and recorded",
        payload: transactionRecord,
        success: true,
      });
    } catch (err) {
      console.error("Error executing transaction:", err);
  
      // Record the failed transaction in the database
      await Transaction.create({
        user: userId,
        wallet: walletId,
        type: "custom",
        asset,
        amount,
        status: "failed",
        metadata: {
          dest,
          calldata,
          error: err.message,
        },
        tx_hash: null,
      });
  
      raiseException(500, "Transaction execution failed");
    }
  });

// Get Wallets
const getWallets = generateController(async (req, res, raiseException) => {
  const { userId } = req.query;

  if (!userId) {
    return raiseException(400, "User ID is required");
  }

  const wallets = await Wallet.find({ user: userId }).exec();

  res.status(200).json({
    message: "Wallets retrieved successfully",
    payload: wallets,
    success: true,
  });
});

// -----------------------------------------------
// TRANSACTIONS
// -----------------------------------------------

// Add Transaction
const addTransaction = generateController(async (req, res, raiseException) => {
  const { userId, walletId, type, amount, asset, status, metadata, tx_hash } =
    req.body;

  if (!userId || !walletId || !type || !amount || !asset) {
    return raiseException(400, "Missing required transaction fields");
  }

  const transaction = await Transaction.create({
    user: userId,
    wallet: walletId,
    type,
    amount,
    asset,
    status: status || "pending",
    metadata: metadata || {},
    tx_hash,
  });

  if (!transaction) {
    return raiseException(500, "Failed to add transaction");
  }

  res.status(201).json({
    message: "Transaction added successfully",
    payload: transaction,
    success: true,
  });
});

// Get Transactions
const getTransactions = generateController(async (req, res, raiseException) => {
  const { userId, walletId } = req.query;

  if (!userId) {
    return raiseException(400, "User ID is required");
  }

  const filter = { user: userId };
  if (walletId) filter.wallet = walletId;

  const transactions = await Transaction.find(filter).exec();

  res.status(200).json({
    message: "Transactions retrieved successfully",
    payload: transactions,
    success: true,
  });
});

export {
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
};
