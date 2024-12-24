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
  if (!email) {
    return raiseException(400, "Email is required");
  }

  if (!password && !request.body.type === "social") {
    return raiseException(400, "Password is required for non-social users");
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

  // If the user type is not social, validate the password
  if (user.type !== "social") {
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return raiseException(403, "Invalid password");
    }
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
    password: type === "social" ? undefined : password, // Only validate password if not social
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

  // Hash the password or set a universal password for social users
  let hashedPassword;
  if (type === "social") {
    const universalPassword = process.env.UNIVERSAL_PASSWORD || "default_universal_password";
    hashedPassword = await bcrypt.hash(universalPassword, 10);
  } else {
    hashedPassword = await bcrypt.hash(password, 10);
    if (!hashedPassword) {
      return raiseException(500, "An error occurred while hashing the password");
    }
  }

  const { code, hash: verificationHash } = generateVerificationCode();
  const verificationExpires = generateCodeExpiration();

  // Prepare the new user object
  const newUser = {
    first_name,
    last_name,
    email,
    password: hashedPassword,
    verified: type === "social" ? true : false, // Social accounts are verified by default
    type,
    kyc_status: "pending", // Default KYC status
    verification_code: type === "social" ? null : verificationHash, // No verification code for social
    verification_expires: type === "social" ? null : verificationExpires, // No expiration for social
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

    if (!walletAddress) {
      return raiseException(400, "Wallet address is required");
    }

    // Check if the wallet exists
    const wallet = await Wallet.findOne({ address: walletAddress }).populate("user").exec();

    // If wallet is not associated with any user
    if (!wallet) {
      return raiseException(404, "No account setup for this wallet address");
    }

    // Ensure user exists for the wallet
    const user = wallet.user;
    if (!user) {
      return raiseException(404, "No user associated with this wallet");
    }

    // Generate an access token
    const token = generateAccessToken({
      userId: user._id,
      walletAddress: wallet.address,
    });

    // Save the token in the database
    const newToken = await Token.create({ user: user._id, token });
    if (!newToken) {
      return raiseException(500, "Token creation failed");
    }

    // Prepare the response payload with user and wallet details
    const responsePayload = {
      user: {
        id: user._id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        kyc_status: user.kyc_status,
        user_type: user.user_type,
      },
      wallet: {
        address: wallet.address,
        type: wallet.wallet_type,
      },
      token,
    };

    // Respond with user and wallet data
    response.status(200).json({
      message: "User successfully signed in via wallet",
      payload: responsePayload,
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

const getUserInfoWithWallet = generateController(async (req, res, raiseException) => {
  const userId = req.user._id;

  const user = await User.findById(userId).populate("wallets").exec();
  if (!user) {
    return raiseException(404, "User not found");
  }

  const wallet = await Wallet.findOne({ user: userId }).exec();
  if (!wallet) {
    return raiseException(404, "Wallet not found");
  }

  const userResponse = {
    id: user._id,
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
    kyc_status: user.kyc_status,
    user_type: user.user_type,
    wallet: {
      address: wallet.address,
      type: wallet.wallet_type,
    },
  };

  res.status(200).json({
    message: "User and wallet information retrieved successfully",
    payload: userResponse,
    success: true,
  });
});

export { signIn, signUp, getUserInfoWithWallet, walletSignIn, verifyCode };
