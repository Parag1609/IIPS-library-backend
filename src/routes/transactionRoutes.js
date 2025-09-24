import express from "express";
import {
  issueBook,
  returnBook,
  getTransactions,
  getTransactionById,
} from "../controllers/transactionController.js";

const router = express.Router();

router.post("/issue", issueBook);
router.put("/return/:transactionId", returnBook);
router.get("/", getTransactions);
router.get("/:id", getTransactionById);

export default router;
