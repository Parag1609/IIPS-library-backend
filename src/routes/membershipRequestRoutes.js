import express from "express";
import {
  createRequest,
  getAllRequests,
  getRequestById,
  approveRequest,
  rejectRequest,
  deleteRequest,
} from "../controllers/membershipRequestController.js";

const router = express.Router();

router.post("/", createRequest); // Student submits request
router.get("/", getAllRequests); // Admin gets all
router.get("/:id", getRequestById); // Admin view single request
router.post("/:id/approve", approveRequest); // Approve request
router.post("/:id/reject", rejectRequest); // Reject request
router.delete("/:id", deleteRequest); // Delete request permanently

export default router;
