import express from "express";
import {
    createMember,
  getAllMembers,
  getMemberById,
  updateMember,
  updateCardStatus,
  issueBook,
  returnBook,
  deleteMember,
} from "../controllers/membershipController.js";

const router = express.Router();

router.post("/",createMember);
router.get("/", getAllMembers);
router.get("/:id", getMemberById);
router.put("/:id", updateMember);
router.patch("/:id/status", updateCardStatus);
router.delete("/:id", deleteMember);

export default router;
