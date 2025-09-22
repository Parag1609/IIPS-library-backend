import express from "express";
import {
  getAllMembers,
  getMemberById,
  updateMember,
  updateCardStatus,
  issueBook,
  returnBook,
  deleteMember,
} from "../controllers/membershipController.js";

const router = express.Router();

router.get("/", getAllMembers);
router.get("/:id", getMemberById);
router.put("/:id", updateMember);
router.patch("/:id/status", updateCardStatus);
router.post("/:id/issue/:bookId", issueBook);
router.post("/:id/return/:bookId", returnBook);
router.delete("/:id", deleteMember);

export default router;
