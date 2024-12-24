// MongoDB Models
import { User } from "../models/User.js";
import { Token } from "../models/Token.js";
import { Wallet } from "../models/Wallet.js";
import { Transaction } from "../models/Transaction.js";




// utils
import { generateController } from "../utils/generateController.js";
import { generateAccessToken } from "../utils/generateAccessToken.js";
import { deployMinimalAccount, initializeBlockchain } from "../utils/abstractWalletUtils.js";

// bcrypt for password hashing
import bcrypt from "bcrypt";
import { Asset } from "../models/Asset.js";
import { Pool } from "../models/Pool.js";

// -----------------------------------------------
// USERS
// -----------------------------------------------

// Fetch User Profile
const getUserProfile = generateController(async (req, res, raiseException) => {
  const userId = req.user?._id;

  if (!userId) {
    return raiseException(401, "Unauthorized: User ID is missing from the token");
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
    try {
      // The authenticated user's ID is available in `req.user` set by `userAuth`
      const userId = req.user?._id;

      if (!userId) {
        return raiseException(401, "Unauthorized: User ID is missing from the token");
      }

      // Destructure the fields to update from the request body
      const { first_name, last_name, profile_details } = req.body;

      // Perform the update operation
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { first_name, last_name, profile_details },
        { new: true, runValidators: true } // `new` returns updated document; `runValidators` ensures schema validation
      ).exec();

      if (!updatedUser) {
        return raiseException(404, "User not found");
      }

      // Respond with success
      res.status(200).json({
        message: "User profile updated successfully",
        payload: updatedUser,
        success: true,
      });
    } catch (error) {
      console.error("Error updating user profile:", error);
      return raiseException(500, "An error occurred while updating the profile");
    }
  }
);

// -----------------------------------------------
// KYC
// -----------------------------------------------

// Submit KYC Details
const submitKYC = generateController(async (req, res, raiseException) => {
  const userId = req.user?._id;

  if (!userId) {
    return raiseException(401, "Unauthorized: User ID is missing from the token");
  }

  const { document_type, document_number, document_image } = req.body;

  if (!document_type || !document_number || !document_image) {
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

const updateKYCStatus = generateController(async (req, res, raiseException) => {
  const { userId, kyc_status } = req.body;

  if (!userId || !kyc_status) {
    return raiseException(400, "User ID and KYC status are required");
  }

  if (!["approved", "rejected"].includes(kyc_status)) {
    return raiseException(400, "Invalid KYC status");
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { kyc_status, "kyc_details.approved_at": kyc_status === "approved" ? new Date() : null },
    { new: true }
  ).exec();

  if (!user) {
    return raiseException(404, "User not found");
  }

  res.status(200).json({
    message: `KYC status updated to ${kyc_status}`,
    payload: user,
    success: true,
  });
});


// Get KYC Status
const getKYCStatus = generateController(async (req, res, raiseException) => {
  const userId = req.user?._id;

  if (!userId) {
    return raiseException(401, "Unauthorized: User ID is missing from the token");
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
  const userId = req.user?._id;

  if (!userId) {
    return raiseException(401, "Unauthorized: User ID is missing from the token");
  }

  const { walletAddress } = req.body;

  if (!walletAddress) {
    return raiseException(400, "Wallet address is required");
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
  const userId = req.user?._id;

  if (!userId) {
    return raiseException(401, "Unauthorized: User ID is missing from the token");
  }

  try {
    // Check if the user exists
    const user = await User.findById(userId).exec();
    if (!user) {
      return raiseException(404, "User not found");
    }

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



const updateUserSettings = generateController(async (req, res, raiseException) => {
  const userId = req.user?._id;

  if (!userId) {
    return raiseException(401, "Unauthorized: User ID is missing from the token");
  }

  const { settings } = req.body;

  if (!settings) {
    return raiseException(400, "Settings are required");
  }

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { $set: { settings } },
    { new: true, runValidators: true }
  ).exec();

  if (!updatedUser) {
    return raiseException(404, "User not found");
  }

  res.status(200).json({
    message: "User settings updated successfully",
    payload: updatedUser,
    success: true,
  });
});


const executeTransaction = generateController(async (req, res, raiseException) => {
    const { userId, dest, calldata } = req.body;
  
    if (!userId || !dest || !calldata) {
      return raiseException(400, "Missing required fields");
    }
  
    // Find the user's wallet
    const wallet = await Wallet.findOne({ user: userId }).exec();
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
        wallet: wallet.address,
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
  const userId = req.user?._id;

  if (!userId) {
    return raiseException(401, "Unauthorized: User ID is missing from the token");
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

/**
 * Calculate total investment in USD for a user, accounting for withdrawals
 */
const getTotalInvestment = generateController(async (req, res, raiseException) => {
  const userId = req.user?._id;

  if (!userId) {
    return raiseException(401, "Unauthorized: User ID is missing from the token");
  }

  try {
    // Step 1: Fetch all deposit and withdraw transactions for the user
    const transactions = await Transaction.find({
      user: userId,
      type: { $in: ["deposit", "withdraw"] },
    }).exec();

    if (transactions.length === 0) {
      return res.status(200).json({
        message: "No relevant transactions found",
        payload: { totalInvestmentUSD: 0 },
        success: true,
      });
    }

    // Step 2: Fetch asset details for the involved assets
    const assetSymbols = [...new Set(transactions.map((tx) => tx.asset))];
    const assets = await Asset.find({ symbol: { $in: assetSymbols } }).exec();

    // Create a mapping of asset symbol to its price feed IDs
    const priceFeedMap = assets.reduce((acc, asset) => {
      acc[asset.symbol] = asset.priceFeeds;
      return acc;
    }, {});

    // Step 3: Fetch current prices for each asset
    const prices = {};
    for (const symbol of assetSymbols) {
      const priceFeeds = priceFeedMap[symbol];

      if (priceFeeds.ChainLink) {
        const chainLinkPrice = await fetchPriceFromAPI("ChainLink", priceFeeds.ChainLink);
        prices[symbol] = chainLinkPrice;
      } else if (priceFeeds.Pyth) {
        const pythPrice = await fetchPriceFromAPI("Pyth", priceFeeds.Pyth);
        prices[symbol] = pythPrice;
      }
    }

    // Step 4: Calculate total investment in USD accounting for withdrawals
    const investmentMap = transactions.reduce((map, tx) => {
      const price = prices[tx.asset];
      if (price) {
        if (!map[tx.asset]) {
          map[tx.asset] = 0;
        }
        map[tx.asset] += tx.type === "deposit" ? tx.amount : -tx.amount; // Add for deposit, subtract for withdrawal
      }
      return map;
    }, {});

    const totalInvestmentUSD = Object.keys(investmentMap).reduce((total, asset) => {
      const amount = investmentMap[asset];
      const price = prices[asset];
      if (price && amount > 0) {
        total += amount * price;
      }
      return total;
    }, 0);

    res.status(200).json({
      message: "Total investment calculated successfully",
      payload: { totalInvestmentUSD },
      success: true,
    });
  } catch (err) {
    console.error("Error calculating total investment:", err);
    raiseException(500, "Failed to calculate total investment");
  }
});




/**
 * Helper function to fetch price from the API
 * @param {string} network - The price feed network (e.g., "ChainLink", "Pyth")
 * @param {string} priceFeedId - The ID of the price feed
 * @returns {number} - The current price of the asset
 */
const fetchPriceFromAPI = async (network, priceFeedId) => {
  try {
    const apiUrl =
      network === "ChainLink"
        ? `https://api.chainlink.com/v1/prices/${priceFeedId}`
        : `https://api.pyth.network/v1/prices/${priceFeedId}`;

    const response = await axios.get(apiUrl);

    // Extract the price based on the API response structure
    return network === "ChainLink"
      ? response.data.price // Replace with actual key if different
      : response.data.current_price; // Replace with actual key if different
  } catch (err) {
    console.error(`Error fetching price from ${network} API:`, err);
    throw new Error("Failed to fetch asset price");
  }
};



/**
 * Get User Assets and Holdings
 */
const getUserAssetsAndPoolsHoldings = generateController(async (req, res, raiseException) => {
  const { userId } = req.query;

  if (!userId) {
    return raiseException(400, "User ID is required.");
  }

  try {
    // Fetch the user's wallets
    const wallets = await Wallet.find({ user: userId })
      .populate("assets.asset")
      .populate("pools.pool")
      .exec();

    if (wallets.length === 0) {
      return res.status(200).json({
        message: "No wallets found for the user.",
        payload: { assets: [], pools: [] },
        success: true,
      });
    }

    // Aggregate assets and pools across all wallets
    const aggregatedAssets = {};
    const aggregatedPools = {};

    wallets.forEach((wallet) => {
      // Aggregate assets
      wallet.assets.forEach(({ asset, amount, lzybra_borrowed }) => {
        if (!aggregatedAssets[asset._id]) {
          aggregatedAssets[asset._id] = {
            ...asset.toObject(),
            totalAmount: 0,
            totalLzybraBorrowed: 0,
          };
        }
        aggregatedAssets[asset._id].totalAmount += amount;
        aggregatedAssets[asset._id].totalLzybraBorrowed += lzybra_borrowed;
      });

      // Aggregate pools
      wallet.pools.forEach(({ pool, amount, lzybra_borrowed }) => {
        if (!aggregatedPools[pool._id]) {
          aggregatedPools[pool._id] = {
            ...pool.toObject(),
            totalAmount: 0,
            totalLzybraBorrowed: 0,
          };
        }
        aggregatedPools[pool._id].totalAmount += amount;
        aggregatedPools[pool._id].totalLzybraBorrowed += lzybra_borrowed;
      });
    });

    // Convert aggregated data to arrays
    const assets = Object.values(aggregatedAssets);
    const pools = Object.values(aggregatedPools);

    res.status(200).json({
      message: "User assets and pools holdings retrieved successfully.",
      payload: { assets, pools },
      success: true,
    });
  } catch (err) {
    console.error("Error fetching user assets and pools holdings:", err);
    raiseException(500, "Failed to fetch user assets and pools holdings.");
  }
});




// Add Transaction
const addTransaction = generateController(async (req, res, raiseException) => {
  const { userId, walletId, type, amount, asset, status, metadata, tx_hash, lzybra_borrowed } = req.body;

  if (!userId || !walletId || !type || !amount || !asset) {
    return raiseException(400, "Missing required transaction fields");
  }

  try {
    // Determine whether the asset is an Asset or a Pool
    let assetType = "Asset"; // Default to Asset
    let linkedModel = await Asset.findOne({ symbol: asset }).exec();

    if (!linkedModel) {
      assetType = "Pool";
      linkedModel = await Pool.findOne({ poolAddress: asset }).exec();
    }

    if (!linkedModel) {
      return raiseException(404, "The provided asset or pool address does not exist.");
    }

    // Adjust the wallet's asset or pool holdings based on the transaction type
    const wallet = await Wallet.findById(walletId).exec();
    if (!wallet) {
      return raiseException(404, "Wallet not found.");
    }

    // Find the specific asset or pool in the wallet
    const targetField = assetType === "Asset" ? "assets" : "pools";
    const targetEntry = wallet[targetField].find((entry) => entry[targetField.slice(0, -1)].toString() === linkedModel._id.toString());

    if (type === "deposit") {
      if (targetEntry) {
        // Update existing entry
        targetEntry.amount += amount;
        if (lzybra_borrowed) targetEntry.lzybra_borrowed += lzybra_borrowed;
      } else {
        // Add a new entry
        wallet[targetField].push({
          [targetField.slice(0, -1)]: linkedModel._id,
          amount,
          lzybra_borrowed: lzybra_borrowed || 0,
        });
      }

      // Update wallet's total investments
      wallet.total_invested += amount;
      if (lzybra_borrowed) wallet.lzybra_borrowed += lzybra_borrowed;
    } else if (type === "withdraw") {
      if (!targetEntry) {
        return raiseException(400, "Cannot withdraw from a non-existent holding.");
      }

      // Subtract from the existing entry
      targetEntry.amount -= amount;
      if (lzybra_borrowed) targetEntry.lzybra_borrowed -= lzybra_borrowed;

      if (targetEntry.amount < 0 || (targetEntry.lzybra_borrowed < 0 && lzybra_borrowed)) {
        return raiseException(400, "Insufficient balance or borrowed amount to complete the withdrawal.");
      }

      // Update wallet's total investments
      wallet.total_invested -= amount;
      if (lzybra_borrowed) wallet.lzybra_borrowed -= lzybra_borrowed;

      // Remove entry if the amount and borrowed are zero
      if (targetEntry.amount === 0 && (!lzybra_borrowed || targetEntry.lzybra_borrowed === 0)) {
        wallet[targetField] = wallet[targetField].filter(
          (entry) => entry[targetField.slice(0, -1)].toString() !== linkedModel._id.toString()
        );
      }
    }

    // Save the updated wallet
    await wallet.save();

    // Create the transaction
    const transaction = await Transaction.create({
      user: userId,
      wallet: walletId,
      type,
      amount,
      asset,
      status: status || "pending",
      metadata: {
        ...metadata,
        category: assetType,
        linkedModelId: linkedModel._id, // Link to the Asset or Pool schema
      },
      tx_hash,
    });

    if (!transaction) {
      return raiseException(500, "Failed to add transaction.");
    }

    res.status(201).json({
      message: "Transaction added successfully",
      payload: transaction,
      success: true,
    });
  } catch (err) {
    console.error("Error adding transaction:", err);
    raiseException(500, "An error occurred while adding the transaction.");
  }
});

// Get Transactions
const getTransactions = generateController(async (req, res, raiseException) => {
  const userId = req.user?._id;
  const { walletId } = req.query;

  if (!userId) {
    return raiseException(401, "Unauthorized: User ID is missing from the token");
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
  updateKYCStatus,
  createAbstractWallet,
  addWallet,
  updateUserSettings,
  getWallets,
  addTransaction,
  getUserAssetsAndPoolsHoldings,
  getTotalInvestment,
  getTransactions,
};
