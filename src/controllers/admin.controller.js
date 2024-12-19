import { Pool } from "../models/Pool.js";
import { Asset } from "../models/Asset.js";
import { generateController } from "../utils/generateController.js";

// Middleware to check if the user is an admin
const isAdmin = (req, res, next) => {
  const { user } = req; // Assuming the user is attached to the request object after authentication
  if (!user || user.role !== "admin") {
    return res.status(403).json({
      message: "Access denied. Only admins can perform this action.",
      success: false,
    });
  }
  next();
};


// --------------------- POOLS ---------------------

// Create a Pool
const createPool = generateController(async (req, res, raiseException) => {
  const { name, description, poolAddress, image } = req.body;

  if (!name || !description || !poolAddress || !image) {
    return raiseException(400, "All fields (name, description, poolAddress, image) are required.");
  }

  const existingPool = await Pool.findOne({ poolAddress }).exec();
  if (existingPool) {
    return raiseException(409, "A pool with this address already exists.");
  }

  const pool = await Pool.create({ name, description, poolAddress, image });

  res.status(201).json({
    message: "Pool created successfully",
    payload: pool,
    success: true,
  });
});

// Update a Pool
const updatePool = generateController(async (req, res, raiseException) => {
  const { poolId } = req.params;
  const { name, description, poolAddress, image } = req.body;

  const pool = await Pool.findById(poolId).exec();
  if (!pool) {
    return raiseException(404, "Pool not found.");
  }

  const updatedPool = await Pool.findByIdAndUpdate(
    poolId,
    { name, description, poolAddress, image },
    { new: true }
  );

  res.status(200).json({
    message: "Pool updated successfully",
    payload: updatedPool,
    success: true,
  });
});

// Delete a Pool
const deletePool = generateController(async (req, res, raiseException) => {
  const { poolId } = req.params;

  const pool = await Pool.findById(poolId).exec();
  if (!pool) {
    return raiseException(404, "Pool not found.");
  }

  await pool.remove();

  res.status(200).json({
    message: "Pool deleted successfully",
    success: true,
  });
});

// --------------------- ASSETS ---------------------

// Create an Asset
const createAsset = generateController(async (req, res, raiseException) => {
  const { name, symbol, image, priceFeeds } = req.body;

  if (!name || !symbol || !image || (!priceFeeds.ChainLink && !priceFeeds.Pyth)) {
    return raiseException(
      400,
      "All fields (name, symbol, image) are required, and at least one price feed must be provided."
    );
  }

  const existingAsset = await Asset.findOne({ symbol }).exec();
  if (existingAsset) {
    return raiseException(409, "An asset with this symbol already exists.");
  }

  const asset = await Asset.create({ name, symbol, image, priceFeeds });

  res.status(201).json({
    message: "Asset created successfully",
    payload: asset,
    success: true,
  });
});

// Update an Asset
const updateAsset = generateController(async (req, res, raiseException) => {
  const { assetId } = req.params;
  const { name, symbol, image, priceFeeds } = req.body;

  const asset = await Asset.findById(assetId).exec();
  if (!asset) {
    return raiseException(404, "Asset not found.");
  }

  const updatedAsset = await Asset.findByIdAndUpdate(
    assetId,
    { name, symbol, image, priceFeeds },
    { new: true }
  );

  res.status(200).json({
    message: "Asset updated successfully",
    payload: updatedAsset,
    success: true,
  });
});

// Delete an Asset
const deleteAsset = generateController(async (req, res, raiseException) => {
  const { assetId } = req.params;

  const asset = await Asset.findById(assetId).exec();
  if (!asset) {
    return raiseException(404, "Asset not found.");
  }

  await asset.remove();

  res.status(200).json({
    message: "Asset deleted successfully",
    success: true,
  });
});

export {
  isAdmin,
  createPool,
  updatePool,
  deletePool,
  createAsset,
  updateAsset,
  deleteAsset,
};
