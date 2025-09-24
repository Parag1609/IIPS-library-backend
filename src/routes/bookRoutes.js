import express from "express";
import {
    addBook,
    getBooks,
    getBookById,
    updateBook,
    deleteBook
} from "../controllers/bookController.js";

const router = express.Router();

router.post("/",addBook);
router.get("/", getBooks);
router.get("/:id", getBookById);
router.put("/:id", updateBook);
router.delete("/:id", deleteBook);

export default router;
