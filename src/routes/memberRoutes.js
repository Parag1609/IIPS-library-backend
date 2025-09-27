import express from "express";
import {
    createMember,
  getAllMembers,
  getMemberById,
  updateMember,
  updateCardStatus,
  deleteMember,
} from "../controllers/membershipController.js";
import {downloadLibraryCardsPDF} from "../controllers/cardDownloadController.js";
const router = express.Router();

router.post("/",createMember);
router.get("/", getAllMembers);
router.get("/:id", getMemberById);
router.put("/:id", updateMember);
router.patch("/:id/status", updateCardStatus);
router.delete("/:id", deleteMember);
router.get("/card/pdf",downloadLibraryCardsPDF);

export default router;
