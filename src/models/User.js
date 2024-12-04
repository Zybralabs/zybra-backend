import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  first_name: { type: String, required: true },
  last_name: { type: String, required: true },
  user_type: { type: String, required: true },
  email: {
    type: String,
    required: true,
    unique: true,
    match:
      /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/,
  },
  password: { type: String, required: true },
  verified: { type: Boolean, required: true },
  profile_status: {
    type: String,
    enum: ["complete", "in-complete"],
    required: true,
  },
  profile_details: {
    type: {
      image: { type: String, required: true },
      about: { type: String, required: true },
      country: { type: String, required: true },
      state: { type: String, required: true },
      city: { type: String, required: true },
      address: { type: String, required: true },
    },
  },
  paid_users: {
    type: [mongoose.mongoose.ObjectId],
    ref: "User",
  },
});

export const User = mongoose.model("User", userSchema);
