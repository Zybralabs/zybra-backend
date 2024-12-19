import mongoose from "mongoose";

const walletSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Links to the User model
  type: {
    type: String,
    enum: ["web3-wallet", "abstraction-wallet"],
    required: true,
  },
  address: { type: String, required: true, unique: true }, // Blockchain wallet address
  total_invested: { type: Number, default: 0 }, // Total amount invested through this wallet
  lzybra_borrowed: { type: Number, default: 0 }, // Total LZYBRA borrowed
  assets: [
    {
      asset: { type: mongoose.Schema.Types.ObjectId, ref: "Asset", required: true }, // Reference to the Asset model
      amount: { type: Number, required: true }, // Total amount of the asset held in this wallet
      lzybra_borrowed: { type: Number, default: 0 }, // LZYBRA borrowed against this asset
    },
  ],
  pools: [
    {
      pool: { type: mongoose.Schema.Types.ObjectId, ref: "Pool", required: true }, // Reference to the Pool model
      amount: { type: Number, required: true }, // Total amount invested in the pool through this wallet
      lzybra_borrowed: { type: Number, default: 0 }, // LZYBRA borrowed against this pool
    },
  ],
  created_at: { type: Date, default: Date.now },
});

export const Wallet = mongoose.model("Wallet", walletSchema);
