import mongoose from "mongoose";

const assetSchema = new mongoose.Schema({
  name: { type: String, required: true }, // Name of the stock or asset
  symbol: { type: String, required: true, unique: true }, // Asset symbol (e.g., TSLA, AAPL)
  image: { type: String, required: true }, // URL or path to the asset's image
  priceFeeds: {
    ChainLink: { type: String, required: false }, // Price feed ID for ChainLink
    Pyth: { type: String, required: false }, // Price feed ID for Pyth
  },
  created_at: { type: Date, default: Date.now }, // Timestamp for asset creation
});

// Custom validator to ensure at least one priceFeedId is provided
assetSchema.pre("save", function (next) {
  const priceFeeds = this.priceFeeds || {};
  if (!priceFeeds.ChainLink && !priceFeeds.Pyth) {
    return next(new Error("At least one priceFeedId (ChainLink or Pyth) is required."));
  }
  next();
});

export const Asset = mongoose.model("Asset", assetSchema);
