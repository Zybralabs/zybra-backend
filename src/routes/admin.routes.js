import express from "express";
import { isAdmin, createPool, updatePool, deletePool, createAsset, updateAsset, deleteAsset } from "../controllers/admin.controller.js";

const router = express.Router();

// Pool Routes
router.post("/pools", isAdmin, createPool); // Create Pool
router.put("/pools/:poolId", isAdmin, updatePool); // Update Pool
router.delete("/pools/:poolId", isAdmin, deletePool); // Delete Pool

// Asset Routes
router.post("/assets", isAdmin, createAsset); // Create Asset
router.put("/assets/:assetId", isAdmin, updateAsset); // Update Asset
router.delete("/assets/:assetId", isAdmin, deleteAsset); // Delete Asset

export default router;
