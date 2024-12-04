// MongoDb Models
import { User } from "../models/User.js";
import { Token } from "../models/Token.js";
import { Wallet } from "../models/Wallet.js"; // Assuming you have a Wallet model

// utils
import { generateController } from "../utils/generateController.js";
import { generateAccessToken } from "../utils/generateAccessToken.js";
import bcrypt from "bcrypt";

// Sign In Controller
const signIn = generateController(async (request, response, raiseException) => {
  const { email, password } = request.body;

  // Check if the user exists
  const user = await User.findOne({ email }).exec();
  if (!user) {
    return raiseException(404, "User with this email doesn't exist");
  }

  // Ensure the user account is verified
  if (!user.verified) {
    return raiseException(403, "Please verify your account first");
  }

  // Compare the provided password with the hashed password
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return raiseException(403, "Invalid password");
  }

  // Generate an access token
  const token = generateAccessToken({
    userId: user._id,
    email: user.email,
  });

  // Save the token in the database
  const newToken = await Token.create({ user: user._id, token });
  if (!newToken) {
    return raiseException(500, "Token creation failed");
  }

  // Respond with user data and token
  response.status(200).json({
    message: "User successfully signed in",
    payload: {
      user: {
        id: user._id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        user_type: user.user_type,
        kyc_status: user.kyc_status,
        wallet: user.wallet, // Return wallet information if available
      },
      token,
    },
    success: true,
  });
});

// Sign Up Controller
const signUp = generateController(async (request, response, raiseException) => {
  const { first_name, last_name, email, password } = request.body;

  // Check if a user with the given email already exists
  const existingUser = await User.findOne({ email }).exec();
  if (existingUser) {
    return raiseException(409, "A user with this email already exists");
  }

  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 10);
  if (!hashedPassword) {
    return raiseException(500, "An error occurred while hashing the password");
  }

  // Create the new user
  const user = await User.create({
    first_name,
    last_name,
    email,
    password: hashedPassword,
    verified: false, // Default to unverified; you can update this flow as needed
    kyc_status: "pending", // Default KYC status
  });

  if (!user) {
    return raiseException(500, "An error occurred while creating the user");
  }

  // Generate an access token
  const token = generateAccessToken({
    userId: user._id,
    email: user.email,
  });

  // Save the token in the database
  const newToken = await Token.create({ user: user._id, token });
  if (!newToken) {
    return raiseException(500, "Token creation failed");
  }

  // Respond with user data and token
  response.status(201).json({
    message: "User successfully signed up",
    payload: {
      user: {
        id: user._id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        user_type: user.user_type,
        kyc_status: user.kyc_status,
      },
      token,
    },
    success: true,
  });
});

// Wallet Signing Controller
const walletSignIn = generateController(
  async (request, response, raiseException) => {
    const { walletAddress } = request.body;

    // Check if a user with the given wallet address exists
    let wallet = await Wallet.findOne({ address: walletAddress }).exec();

    // If wallet doesn't exist, create a new wallet and user
    if (!wallet) {
      const newUser = await User.create({
        first_name: null,
        last_name: null,
        email: null,
        password: null,
        verified: true, // Wallet sign-in users are assumed verified
        kyc_status: "pending",
      });

      wallet = await Wallet.create({
        user: newUser._id,
        address: walletAddress,
        wallet_type: "web3-wallet", // Default wallet type
      });
    }

    // Generate an access token
    const token = generateAccessToken({
      userId: wallet.user,
      walletAddress: wallet.address,
    });

    // Save the token in the database
    const newToken = await Token.create({ user: wallet.user, token });
    if (!newToken) {
      return raiseException(500, "Token creation failed");
    }

    // Respond with user and wallet data
    response.status(200).json({
      message: "User successfully signed in via wallet",
      payload: {
        wallet: {
          address: wallet.address,
          type: wallet.wallet_type,
        },
        token,
      },
      success: true,
    });
  }
);

export { signIn, signUp, walletSignIn };
