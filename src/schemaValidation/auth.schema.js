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

const signUpUserSchema = signInUserSchema.keys({
  first_name: joi.string().required(),
  last_name: joi.string().required(),
  user_type: joi.string().required(),
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

export {
  signUpUserSchema,
  signInUserSchema,
  tokenReqSchema,
  emailReqSchema,
  resetPassSchema,
  createProfileSchema,
  updateProfileSchema,
  deleteProfileSchema,
};
