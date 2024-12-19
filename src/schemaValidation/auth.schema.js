import joi from "joi";

const tokenReqSchema = joi.object().keys({
  token: joi.string().required(),
});

const emailReqSchema = joi.object().keys({
  email: joi
    .string()
    .required()
    .email({ tlds: { allow: false } }),
});

const passwordValidation = joi
  .string()
  .min(8)
  .regex(/(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*\W)/)
  .messages({
    "string.pattern.base":
      "Your password must be at least 8 characters and contain uppercase and lowercase letters, numbers, and a special character.",
  });

const signInUserSchema = emailReqSchema.keys({
  password: passwordValidation,
});


const profileDetailsSchema = joi.object({
  image: joi.string().uri().optional(), // Optional image URL
  about: joi.string().optional(),
  country: joi.string().optional(),
  state: joi.string().optional(),
  city: joi.string().optional(),
  address: joi.string().optional(),
});

const signUpUserSchema = joi.object({
  first_name: joi.string().required(),
  last_name: joi.string().optional(),
  user_type: joi.string().valid("admin", "customer").optional(), // Valid values for `user_type`
  email: joi.string()
    .email({ tlds: { allow: true } }) // Email validation
    .required(),
  password: joi.string().min(8).required(), // Password must be at least 8 characters
  profile_details: profileDetailsSchema.optional(), // Optional profile details
  verified: joi.boolean().default(false), // Default is false
  profile_status: joi.string().valid("complete", "in-complete").default("in-complete"),
  wallet: joi.string().optional(), // Optional array of wallet references
});

 const verifyCodeSchema = joi.object({
  email: joi.string().email({ tlds: { allow: true } }).required(),
  code: joi.string().length(6).required(), // 6-digit verification code
});

// Wallet Sign-In Schema
 const walletSignInSchema = joi.object({
  walletAddress: joi.string().required(),
});

const resetPassSchema = tokenReqSchema.keys({
  newPass: passwordValidation,
});

export const idValidation = joi
  .string()
  .hex()
  .required()
  .custom((value, helper) => {
    if (value.length !== 24) {
      return helper.message("`ownerId` contains must be valid Object Id");
    } else {
      return true;
    }
  });

const createProfileSchema = joi.object().keys({
  id: idValidation,
  image: joi.string().required(),
  about: joi.string().required(),
  country: joi.string().required(),
  state: joi.string().required(),
  city: joi.string().required(),
  address: joi.string().required(),
});

const updateProfileSchema = joi.object().keys({
  id: idValidation,
  image: joi.string(),
  about: joi.string(),
  country: joi.string(),
  state: joi.string(),
  city: joi.string(),
  address: joi.string(),
});

const deleteProfileSchema = joi.object().keys({
  id: idValidation,
});


const emailVerificationSchema = joi.object({
  email: joi.string().email({ tlds: { allow: true } }).required(),
});

export {
  signUpUserSchema,
  signInUserSchema,
  tokenReqSchema,
  emailReqSchema,
  resetPassSchema,
  verifyCodeSchema,
walletSignInSchema,
  createProfileSchema,
  updateProfileSchema,
  emailVerificationSchema,
  deleteProfileSchema,
};
