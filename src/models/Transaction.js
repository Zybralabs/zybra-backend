import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Links to the User model
  wallet: { type: mongoose.Schema.Types.ObjectId, ref: "Wallet", required: true }, // Links to the Wallet model
  tx_id: { type: String, required: true }, // Unique transaction ID (e.g., tx hash from the blockchain)
  type: {
    type: String,
    enum: [
      "requestDeposit",
      "deposit",
      "cancelDepositRequest",
      "withdraw",
      "cancelWithdrawRequest",
      "requestWithdraw",
      "claimCancelDepositRequest",
      "liquidation",
      "repayingDebt",
      "mint",
      "burn",
    ],
    required: true,
  },
  asset: { type: String, required: true }, // Asset involved (e.g., "USDT", "ETH", etc.)
  amount: { type: Number, required: true }, // Amount involved in the transaction
  status: {
    type: String,
    enum: ["pending", "completed", "failed", "cancelled"],
    default: "pending", // Default status
  },
  vault: { type: String, required: true }, // Address of the vault involved in the transaction
  metadata: {
    type: Map,
    of: String, // Extra information (e.g., tranche IDs, keeper details)
  },
  tx_hash: { type: String }, // Blockchain transaction hash
  timestamp: { type: Date, default: Date.now }, // When the transaction was initiated
});

export const Transaction = mongoose.model("Transaction", transactionSchema);
