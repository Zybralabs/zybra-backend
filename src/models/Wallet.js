import mongoose from "mongoose";

const walletSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Links to the User model
    type: {
      type: String,
      enum: ["web3-wallet", "abstraction-wallet"],
      required: true,
    },
    address: { type: String, required: true, unique: true }, // Blockchain wallet address
    created_at: { type: Date, default: Date.now },
  });
  
  export const Wallet = mongoose.model("Wallet", walletSchema);
  