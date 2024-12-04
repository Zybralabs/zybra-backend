// MongoDb Models
import { User } from "../models/User.js";
import { Token } from "../models/Token.js";

// utils
import { generateController } from "../utils/generateController.js";
import { generateAccessToken } from "../utils/generateAccessToken.js";

//
import { ObjectId } from "mongodb";
import bcrypt from "bcrypt";

const signIn = generateController(async (request, response, raiseException) => {
  const { email, password } = request.body;

  const user = await User.findOne({ email }).exec();

  if (!user) {
    return raiseException(404, "User with this email doesn't exist");
  }

  if (!user.verified) {
    return raiseException(403, "Please verify your account first");
  }

  bcrypt.compare(password, user.password, async (err, result) => {
    if (err) {
      return raiseException(500, "Auth failed");
    }

    if (!result) {
      return raiseException(403, "Invalid Password");
    }

    const token = generateAccessToken({
      userId: user._id,
      email: user.email,
      password: user.password,
    });

    try {
      const isToken = await Token.create({ user: user._id, token });

      if (!isToken) {
        return raiseException(500, "Token creation failed");
      }

      response.status(200).json({
        message: "User successfully signed in",
        payload: { user, token },
        success: true,
      });
    } catch (err) {
      return raiseException(
        500,
        err.message || "An error occurred while signing in"
      );
    }
  });
});

const signUp = generateController(async (request, response, raiseException) => {
  const { first_name, last_name, email, password } = request.body;

  bcrypt.hash(password, 10, async (err, hash) => {
    if (err) {
      return raiseException(500, err || "An error occurred while signing up");
    }

    try {
      const user = await User.create({
        first_name,
        last_name,
        email,
        password: hash,
      });

      if (!user) {
        return raiseException(500, "An error occurred while signing up");
      }

      const newToken = generateAccessToken({
        userId: user._id,
        email: user.email,
        password: user.password,
      });

      const isToken = await Token.create({
        user: user._id,
        token: newToken,
      });

      if (!isToken) {
        return raiseException(500, "Token creation failed");
      }

      response.status(201).json({
        message: "User successfully signed up",
        payload: { user, token: newToken },
        success: true,
      });
    } catch (err) {
      return raiseException(
        500,
        err.message || "An error occurred while signing up"
      );
    }
  });
});

export { signIn, signUp };
