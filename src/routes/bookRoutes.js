import express from "express";
import {
    addBook,
    getBooks,
    getBookById,
    updateBook,
    deleteBook
} from "../controllers/bookController.js";
import {importBooksFromCSV} from "../controllers/csvImportController.js";
import {uploadcsv} from "../middleware/multer.middleware.js";
import {downloadBarcodesGridPDF} from "../controllers/barcodeController.js"

const router = express.Router();

router.post("/",addBook);
router.post("/upload-csv" ,uploadcsv.single("file"), importBooksFromCSV);
router.get("/", getBooks);
router.get("/:id", getBookById);
router.get("/barcodes/pdf",downloadBarcodesGridPDF);
router.put("/:id", updateBook);
router.delete("/:id", deleteBook);

export default router;
