import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  first_name: { type: String, required: true },
  last_name: { type: String, required: false },
  user_type: { type: String, required: false, default:"User" }, // Example: 'admin', 'customer', etc.
  email: {
    type: String,
    required: true,
    unique: true,
    match: /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,4}$/, // Simplified email regex
  },
  type: {
    type: String,
    enum: ["email", "social"],
    default: "email",
  },
  password: { type: String, required: true },
  verified: { type: Boolean, default: false }, // Default to `false` until verified
  profile_status: {
    type: String,
    enum: ["complete", "in-complete"],
    default: "in-complete", // Default for new users
  },
  wallets: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet", // References the Wallet model
    },
  ],
  kyc_status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  verification_code: { type: String }, // Stores the verification code
  verification_expires: { type: Date }, // Expiry for the code
  kyc_details: {
    type: {
      document_type: { type: String }, // Example: 'passport', 'driver_license'
      document_number: { type: String },
      document_image: { type: String }, // Path to document image
      submitted_at: { type: Date, default: Date.now },
      approved_at: { type: Date },
    },
    default: {}, // Optional for users without KYC
  },
  created_at: { type: Date, default: Date.now }, // Tracks creation time
  updated_at: { type: Date, default: Date.now }, // Tracks last update
});

// Middleware to update `updated_at` automatically
userSchema.pre("save", function (next) {
  this.updated_at = Date.now();
  next();
});

export const User = mongoose.model("User", userSchema);
