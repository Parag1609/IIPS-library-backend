import express from "express";
import {
    createMember,
  getAllMembers,
  getMemberById,
  getMemberByMemberId,
  updateMember,
  updateCardStatus,
  deleteMember,
} from "../controllers/membershipController.js";
import {downloadLibraryCardsPDF,
   previewLibraryCardsPDF,
   previewSingleLibraryCardPDF,
   downloadSingleMemberCard
  } from "../controllers/cardDownloadController.js";
const router = express.Router();

router.post("/",createMember);
router.get("/", getAllMembers);
router.get("/find", getMemberByMemberId);
router.get("/:id", getMemberById);

router.put("/:id", updateMember);
router.patch("/:id/status", updateCardStatus);
router.delete("/:id", deleteMember);
router.get("/cards/pdf",downloadLibraryCardsPDF);
router.get("/cards/preview",previewLibraryCardsPDF);
router.get("/card/:id/preview",previewSingleLibraryCardPDF);
router.get("/card/:id/pdf",downloadSingleMemberCard);


export default router;
