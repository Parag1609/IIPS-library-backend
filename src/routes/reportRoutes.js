import express from 'express';
import * as reportController from '../controllers/reportController.js';

const router = express.Router();

// Dashboard
router.get('/dashboard', reportController.getDashboardStats);

// Book Reports
router.get('/books/most-issued',  reportController.getMostIssuedBooks);
router.get('/books/by-status', reportController.getBooksByStatus);
router.get('/books/lost',  reportController.getLostBooksReport);
router.get('/books/writeOff',  reportController.getWriteOffBooksReport);
// Member Reports
router.get('/members/by-type',reportController.getMembersByType);
router.get('/members/by-course', reportController.getMembersByCourse);
router.get('/members/by-year', reportController.getMembersByYear);
router.get('/members/inactive', reportController.getInactiveMembersReport);

// Transaction Reports
router.get('/transactions/daily', reportController.getDailyTransactions);
router.get('/transactions/monthly', reportController.getMonthlyTransactions);
router.get('/transactions/weekly', reportController.getWeeklyTransactions);
router.get('/transactions/custom', reportController.getCustomRangeTransactions);
router.get('/transactions/currently-issued', reportController.getCurrentlyIssuedBooks);
router.get('/transactions/member/:memberId', reportController.getMemberTransactionHistory);

// Financial Reports
router.get('/financial/book-value', reportController.getBookValueReport);

export default router;