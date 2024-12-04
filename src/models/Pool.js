import mongoose from "mongoose";

const poolSchema = new mongoose.Schema({
  name: { type: String, required: true }, // Name of the pool
  description: { type: String, required: true }, // Short description of the pool
  poolAddress: { type: String, required: true, unique: true }, // Unique blockchain address of the pool
  image: { type: String, required: true }, // URL or path to the pool's image
  created_at: { type: Date, default: Date.now }, // Timestamp for pool creation
});

// Pre-save validation to ensure poolAddress is unique and not null
poolSchema.pre("save", async function (next) {
  if (!this.poolAddress) {
    return next(new Error("Pool address is required."));
  }
  const existingPool = await mongoose.model("Pool").findOne({ poolAddress: this.poolAddress });
  if (existingPool) {
    return next(new Error("Pool address must be unique."));
  }
  next();
});

export const Pool = mongoose.model("Pool", poolSchema);
