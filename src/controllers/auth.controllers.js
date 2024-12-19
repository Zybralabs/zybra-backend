// MongoDb Models
import { User } from "../models/User.js";
import { Token } from "../models/Token.js";
import { Wallet } from "../models/Wallet.js"; // Assuming you have a Wallet model
import crypto from "crypto";
// utils
import { generateController } from "../utils/generateController.js";
import { generateAccessToken } from "../utils/generateAccessToken.js";
import bcrypt from "bcrypt";
import { sendVerificationCode } from "../utils/email.js";


/**
 * Generate a verification code and its expiration time.
 */
export const generateVerificationCode = () => {
  const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
  const hash = crypto.createHash("sha256").update(code).digest("hex"); // Hash for secure storage
  const expires = new Date(Date.now() + 15 * 60 * 1000); // 15-minute expiration
  return { code, hash, expires };
};

export const sendVerificationEmailController = generateController(
  async (request, response, raiseException) => {
    const { email } = request.body;

    // Validate that the authenticated user's email matches the provided email
    if (request.user.email !== email) {
      return raiseException(403, "You are not authorized to perform this action");
    }

    // Validate that the user exists
    const user = await User.findOne({ email }).exec();
    if (!user) {
      return raiseException(404, "User with this email doesn't exist");
    }

    // Check if the user is already verified
    if (user.verified) {
      return raiseException(400, "User is already verified");
    }

    // Generate a new verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code

    // Save the code and expiration to the user's profile
    user.verification_code = code;
    user.verification_expires = new Date(Date.now() + 15 * 60 * 1000); // Expires in 15 minutes
    await user.save();

    // Send the email with the verification code
    await sendVerificationCode(email, code);

    response.status(200).json({
      message: "Verification email sent successfully",
      success: true,
    });
  }
);

// Sign In Controller
const signIn = generateController(async (request, response, raiseException) => {
  const { email, password } = request.body;

  // Validate the incoming data
  if (!email || !password) {
    return raiseException(400, "Email and password are required");
  }

  // Check if the user exists
  const user = await User.findOne({ email }).populate("wallets", "address type").exec();
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

  // Structure the response payload with user and wallet data
  const userResponse = {
    id: user._id,
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
    kyc_status: user.kyc_status,
    user_type: user.user_type,
    wallets: user.wallets || [], // Include populated wallet data
  };

  // Respond with user data and token
  response.status(200).json({
    message: "User successfully signed in",
    payload: {
      user: userResponse,
      token,
    },
    success: true,
  });
});

// Sign Up Controller
const signUp = generateController(async (request, response, raiseException) => {
  const {
    first_name,
    last_name,
    email,
    password,
    type,
    wallet, // Optional wallet address
  } = request.body;

  // Validate the incoming data with the schema
  const validation = signUpUserSchema.validate({
    first_name,
    last_name,
    email,
    password,
    type,
    wallet,
  });

  if (validation.error) {
    return raiseException(400, validation.error.details[0].message);
  }

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

  const { code, hash: verificationHash } = generateVerificationCode();
  const verificationExpires = generateCodeExpiration();

  // Prepare the new user object
  const newUser = {
    first_name,
    last_name,
    email,
    password: hashedPassword,
    verified: false, // Default to unverified; you can update this flow as needed
    type,
    kyc_status: "pending", // Default KYC status
    verification_code: verificationHash,
    verification_expires: verificationExpires,
    wallets: [], // Initialize as an empty array
  };

  // If a wallet address is provided, ensure it's unique and create the wallet record
  let walletRecord = null;
  if (wallet) {
    const existingWallet = await Wallet.findOne({ address: wallet }).exec();
    if (existingWallet) {
      return raiseException(409, "This wallet address is already associated with another user");
    }

    walletRecord = new Wallet({
      address: wallet,
      type: "web3-wallet", // Ensure it's correctly labeled as a `web3-wallet`
    });

    await walletRecord.save(); // Save the wallet to the database

    // Add the wallet reference to the user
    newUser.wallets.push(walletRecord._id);
  }

  // Create the user
  const user = await User.create(newUser);

  if (!user) {
    return raiseException(500, "An error occurred while creating the user");
  }

  // If a wallet was created, associate it with the user in the wallet schema
  if (walletRecord) {
    walletRecord.user = user._id;
    await walletRecord.save();
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

  // Populate the wallet references for response
  const populatedUser = await User.findById(user._id)
    .populate("wallets", "address type") // Populate wallet address and type
    .exec();

  // Respond with user data and token
  response.status(201).json({
    message: "User successfully signed up",
    payload: {
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

const verifyCode = generateController(async (request, response, raiseException) => {
  const { email, code } = request.body;

  // Validate inputs
  if (!email || !code) {
    return raiseException(400, "Email and code are required");
  }

  const user = await User.findOne({ email }).exec();
  if (!user) {
    return raiseException(404, "User not found");
  }

  // Check code and expiration
  if (!user.verification_code || user.verification_code !== code) {
    return raiseException(403, "The verification code is incorrect or has expired");
  }

  if (user.verification_expires < new Date()) {
    console.warn(`Expired code attempt for user: ${email}`);
    return raiseException(403, "Verification code expired");
  }

  // Mark user as verified
  user.verified = true;
  user.verification_code = null; // Clear the code
  user.verification_expires = null;
  await user.save();

  response.status(200).json({
    message: "Email verified successfully",
    success: true,
  });
});

export { signIn, signUp, walletSignIn, verifyCode };
