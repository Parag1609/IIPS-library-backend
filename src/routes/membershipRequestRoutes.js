import express from "express";
import {
  createRequest,
  getAllRequests,
  getRequestById,
  approveRequest,
  rejectRequest,
  deleteRequest,
} from "../controllers/membershipRequestController.js";
import { uploadcsv } from "../middleware/multer.middleware.js";
import { importMembershipRequestsFromCSV } from "../controllers/csvImportController.js";

const router = express.Router();

router.post("/", createRequest); // Student submits request
router.get("/", getAllRequests); // Admin gets all
router.get("/:id", getRequestById); // Admin view single request
router.post("/:id/approve", approveRequest); // Approve request
router.post("/:id/reject", rejectRequest); // Reject request
router.delete("/:id", deleteRequest); // Delete request permanently
router.post(
  "/upload-csv",
  uploadcsv.single("file"), // frontend form-data field = "file"
  importMembershipRequestsFromCSV
);

export default router;
