
import Book from '../models/Book.js';
import Member from '../models/Member.js';
import Transaction from '../models/Transaction.js';
import mongoose from 'mongoose';

// ============================================
// 1. DASHBOARD OVERVIEW STATISTICS
// ============================================
export const getDashboardStats = async (req, res) => {
  try {
    const [
      totalBooks,
      availableBooks,
      issuedBooks,
      lostBooks,
      writeoffBooks,
      totalMembers,
      activeMembers,
      inactiveMembers,
      activeTransactions,
      studentMembers,
      facultyMembers,
      specialMembers
    ] = await Promise.all([
      Book.countDocuments(),
      Book.countDocuments({ availabilityStatus: 'available' }),
      Book.countDocuments({ availabilityStatus: 'issued' }),
      Book.countDocuments({ availabilityStatus: 'lost' }),
      Book.countDocuments({ availabilityStatus: 'write-off' }),
      Member.countDocuments(),
      Member.countDocuments({ cardStatus: 'active' }),
      Member.countDocuments({ cardStatus: 'inactive' }),
      Transaction.countDocuments({ status: 'issued' }),
      Member.countDocuments({ memberType: 'student' }),
      Member.countDocuments({ memberType: 'faculty' }),
      Member.countDocuments({ memberType: 'special' })
    ]);

    res.json({
      success: true,
      data: {
        books: {
          total: totalBooks,
          available: availableBooks,
          issued: issuedBooks,
          lost: lostBooks,
          write_off: writeoffBooks,
        },
        members: {
          total: totalMembers,
          active: activeMembers,
          inactive: inactiveMembers,
          byType: {
            student: studentMembers,
            faculty: facultyMembers,
            special: specialMembers
          }
        },
        transactions: {
          active: activeTransactions
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. BOOK REPORTS
export const getMostIssuedBooks = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const mostIssued = await Transaction.aggregate([
      {
        $group: {
          _id: '$book',
          issueCount: { $sum: 1 }
        }
      },
      { $sort: { issueCount: -1 } },
      { $limit: parseInt(limit) },
      {
        $lookup: {
          from: 'books',
          localField: '_id',
          foreignField: '_id',
          as: 'bookDetails'
        }
      },
      { $unwind: '$bookDetails' },
      {
        $project: {
          title: '$bookDetails.title',
          author: '$bookDetails.author_name',
          accessionNumber: '$bookDetails.accession_number',
          issueCount: 1
        }
      }
    ]);

    res.json({ success: true, data: mostIssued });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Books by Status
export const getBooksByStatus = async (req, res) => {
  try {
    const bookStats = await Book.aggregate([
      {
        $group: {
          _id: '$availabilityStatus',
          count: { $sum: 1 },
          books: {
            $push: {
              accessionNumber: '$accession_number',
              title: '$title',
              author: '$author_name'
            }
          }
        }
      }
    ]);

    res.json({ success: true, data: bookStats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Lost Books Report
export const getLostBooksReport = async (req, res) => {
  try {
    const lostBooks = await Book.find({ availabilityStatus: 'lost' })
      .select('accession_number title author_name rate supplier bill_number')
      .sort({ title: 1 });

    const totalValue = lostBooks.reduce((sum, book) => sum + (book.rate || 0), 0);

    res.json({
      success: true,
      data: {
        books: lostBooks,
        totalLost: lostBooks.length,
        totalValue
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

//writeoff books report
export const getWriteOffBooksReport = async (req, res) => {
  try {
    const writeOffBooks = await Book.find({ availabilityStatus: 'writeoff' })
      .select('accession_number title author_name rate supplier bill_number')
      .sort({ title: 1 });

    const totalValue = writeOffBooks.reduce((sum, book) => sum + (book.rate || 0), 0);

    res.json({
      success: true,
      data: {
        books: writeOffBooks,
        totalWriteOff: writeOffBooks.length,
        totalValue
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================
// 3. MEMBER REPORTS
// ============================================

// Members by Type
export const getMembersByType = async (req, res) => {
  try {
    const memberStats = await Member.aggregate([
      {
        $group: {
          _id: '$memberType',
          count: { $sum: 1 },
          active: {
            $sum: { $cond: [{ $eq: ['$cardStatus', 'active'] }, 1, 0] }
          },
          inactive: {
            $sum: { $cond: [{ $eq: ['$cardStatus', 'inactive'] }, 1, 0] }
          }
        }
      }
    ]);

    res.json({ success: true, data: memberStats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Members by Course (Students only)
export const getMembersByCourse = async (req, res) => {
  try {
    const courseStats = await Member.aggregate([
      { $match: { memberType: 'student', course: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: '$course',
          count: { $sum: 1 },
          active: {
            $sum: { $cond: [{ $eq: ['$cardStatus', 'active'] }, 1, 0] }
          }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json({ success: true, data: courseStats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Members by Year of Joining
export const getMembersByYear = async (req, res) => {
  try {
    const yearStats = await Member.aggregate([
      {
        $group: {
          _id: '$yearOfJoining',
          count: { $sum: 1 },
          students: {
            $sum: { $cond: [{ $eq: ['$memberType', 'student'] }, 1, 0] }
          },
          faculty: {
            $sum: { $cond: [{ $eq: ['$memberType', 'faculty'] }, 1, 0] }
          },
          special: {
            $sum: { $cond: [{ $eq: ['$memberType', 'special'] }, 1, 0] }
          }
        }
      },
      { $sort: { _id: -1 } }
    ]);

    res.json({ success: true, data: yearStats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Inactive Members Report
export const getInactiveMembersReport = async (req, res) => {
  try {
    const inactiveMembers = await Member.find({ cardStatus: 'inactive' })
      .select('name memberNumber memberType mobile email yearOfJoining')
      .sort({ name: 1 });

    res.json({
      success: true,
      data: {
        members: inactiveMembers,
        totalInactive: inactiveMembers.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Daily Transaction Report
export const getDailyTransactions = async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();
    
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    const [issued, returned] = await Promise.all([
      Transaction.find({
        issueDate: { $gte: startOfDay, $lte: endOfDay }
      })
        .populate('member', 'name memberNumber memberType')
        .populate('book', 'title author_name accession_number')
        .sort({ issueDate: -1 }),
      
      Transaction.find({
        returnDate: { $gte: startOfDay, $lte: endOfDay }
      })
        .populate('member', 'name memberNumber memberType')
        .populate('book', 'title author_name accession_number')
        .sort({ returnDate: -1 })
    ]);

    res.json({
      success: true,
      data: {
        date: targetDate.toISOString().split('T')[0],
        issued: {
          count: issued.length,
          transactions: issued
        },
        returned: {
          count: returned.length,
          transactions: returned
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
// Weekly Transaction Report
export const getWeeklyTransactions = async (req, res) => {
  try {
    const { startDate } = req.query;
    const weekStart = startDate ? new Date(startDate) : new Date();
    
    // Set to start of week (Monday)
    weekStart.setHours(0, 0, 0, 0);
    const dayOfWeek = weekStart.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust if Sunday
    weekStart.setDate(weekStart.getDate() + diff);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    
    const [issued, returned] = await Promise.all([
      Transaction.find({
        issueDate: { $gte: weekStart, $lte: weekEnd }
      })
        .populate('member', 'name memberNumber memberType')
        .populate('book', 'title author_name accession_number')
        .sort({ issueDate: -1 }),
      
      Transaction.find({
        returnDate: { $gte: weekStart, $lte: weekEnd }
      })
        .populate('member', 'name memberNumber memberType')
        .populate('book', 'title author_name accession_number')
        .sort({ returnDate: -1 })
    ]);
    
    // Day-wise breakdown for the week
    const dailyStats = await Transaction.aggregate([
      {
        $match: {
          $or: [
            { issueDate: { $gte: weekStart, $lte: weekEnd } },
            { returnDate: { $gte: weekStart, $lte: weekEnd } }
          ]
        }
      },
      {
        $facet: {
          issued: [
            {
              $match: { issueDate: { $exists: true, $ne: null } }
            },
            {
              $group: {
                _id: {
                  $dateToString: { format: "%Y-%m-%d", date: "$issueDate" }
                },
                count: { $sum: 1 }
              }
            }
          ],
          returned: [
            {
              $match: { returnDate: { $exists: true, $ne: null } }
            },
            {
              $group: {
                _id: {
                  $dateToString: { format: "%Y-%m-%d", date: "$returnDate" }
                },
                count: { $sum: 1 }
              }
            }
          ]
        }
      }
    ]);
    
    res.json({
      success: true,
      data: {
        weekStart: weekStart.toISOString().split('T')[0],
        weekEnd: weekEnd.toISOString().split('T')[0],
        issued: {
          count: issued.length,
          transactions: issued
        },
        returned: {
          count: returned.length,
          transactions: returned
        },
        dailyBreakdown: dailyStats[0]
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Custom Date Range Transaction Report
export const getCustomRangeTransactions = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Both startDate and endDate are required'
      });
    }
    
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    // Validate date range
    if (start > end) {
      return res.status(400).json({
        success: false,
        message: 'startDate cannot be after endDate'
      });
    }
    
    const [issued, returned, statistics] = await Promise.all([
      Transaction.find({
        issueDate: { $gte: start, $lte: end }
      })
        .populate('member', 'name memberNumber memberType')
        .populate('book', 'title author_name accession_number')
        .sort({ issueDate: -1 }),
      
      Transaction.find({
        returnDate: { $gte: start, $lte: end }
      })
        .populate('member', 'name memberNumber memberType')
        .populate('book', 'title author_name accession_number')
        .sort({ returnDate: -1 }),
      
      // Get detailed statistics
      Transaction.aggregate([
        {
          $match: {
            $or: [
              { issueDate: { $gte: start, $lte: end } },
              { returnDate: { $gte: start, $lte: end } }
            ]
          }
        },
        {
          $facet: {
            dailyIssued: [
              {
                $match: { issueDate: { $gte: start, $lte: end } }
              },
              {
                $group: {
                  _id: {
                    $dateToString: { format: "%Y-%m-%d", date: "$issueDate" }
                  },
                  count: { $sum: 1 }
                }
              },
              { $sort: { _id: 1 } }
            ],
            dailyReturned: [
              {
                $match: { returnDate: { $gte: start, $lte: end } }
              },
              {
                $group: {
                  _id: {
                    $dateToString: { format: "%Y-%m-%d", date: "$returnDate" }
                  },
                  count: { $sum: 1 }
                }
              },
              { $sort: { _id: 1 } }
            ],
            memberTypeBreakdown: [
              {
                $match: { issueDate: { $gte: start, $lte: end } }
              },
              {
                $lookup: {
                  from: 'members',
                  localField: 'member',
                  foreignField: '_id',
                  as: 'memberInfo'
                }
              },
              { $unwind: '$memberInfo' },
              {
                $group: {
                  _id: '$memberInfo.memberType',
                  count: { $sum: 1 }
                }
              }
            ]
          }
        }
      ])
    ]);
    
    // Calculate duration in days
    const durationDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    
    res.json({
      success: true,
      data: {
        dateRange: {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0],
          durationDays
        },
        issued: {
          count: issued.length,
          transactions: issued
        },
        returned: {
          count: returned.length,
          transactions: returned
        },
        statistics: statistics[0],
        averages: {
          issuedPerDay: (issued.length / durationDays).toFixed(2),
          returnedPerDay: (returned.length / durationDays).toFixed(2)
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Monthly Transaction Report
export const getMonthlyTransactions = async (req, res) => {
  try {
    const { year, month } = req.query;
    const targetYear = parseInt(year) || new Date().getFullYear();
    const targetMonth = parseInt(month) || new Date().getMonth() + 1;

    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);

    const [issued, returned] = await Promise.all([
      Transaction.countDocuments({
        issueDate: { $gte: startDate, $lte: endDate }
      }),
      Transaction.countDocuments({
        returnDate: { $gte: startDate, $lte: endDate }
      })
    ]);

    // Day-wise breakdown
    const dailyStats = await Transaction.aggregate([
      {
        $match: {
          $or: [
            { issueDate: { $gte: startDate, $lte: endDate } },
            { returnDate: { $gte: startDate, $lte: endDate } }
          ]
        }
      },
      {
        $group: {
          _id: {
            day: { $dayOfMonth: '$issueDate' },
            type: '$status'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.day': 1 } }
    ]);

    res.json({
      success: true,
      data: {
        year: targetYear,
        month: targetMonth,
        totalIssued: issued,
        totalReturned: returned,
        dailyBreakdown: dailyStats
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getCurrentlyIssuedBooks = async (req, res) => {
  try {
    const issuedBooks = await Transaction.find({ status: 'issued' })
      .populate('member', 'name memberNumber memberType mobile')
      .populate('book', 'title author_name accession_number')
      .sort({ issueDate: -1 });

    res.json({
      success: true,
      data: {
        total: issuedBooks.length,
        books: issuedBooks
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// Transaction History by Member
export const getMemberTransactionHistory = async (req, res) => {
  try {
    const { memberId } = req.params;

    const transactions = await Transaction.find({ member: memberId })
      .populate('book', 'title author_name accession_number')
      .sort({ issueDate: -1 });

    const stats = {
      totalIssued: transactions.length,
      currentlyIssued: transactions.filter(t => t.status === 'issued').length,
      returned: transactions.filter(t => t.status === 'returned').length
    };

    res.json({
      success: true,
      data: {
        stats,
        transactions
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================
// 5. FINANCIAL REPORTS
// ============================================

// Total Book Value Report
export const getBookValueReport = async (req, res) => {
  try {
    const [totalValue, byStatus, bySupplier] = await Promise.all([
      Book.aggregate([
        {
          $group: {
            _id: null,
            totalValue: { $sum: '$rate' },
            totalBooks: { $sum: 1 },
            averageValue: { $avg: '$rate' }
          }
        }
      ]),
      
      Book.aggregate([
        {
          $group: {
            _id: '$availabilityStatus',
            totalValue: { $sum: '$rate' },
            count: { $sum: 1 }
          }
        }
      ]),
      
      Book.aggregate([
        { $match: { supplier: { $exists: true, $ne: null, $ne: '' } } },
        {
          $group: {
            _id: '$supplier',
            totalValue: { $sum: '$rate' },
            count: { $sum: 1 }
          }
        },
        { $sort: { totalValue: -1 } }
      ])
    ]);

    res.json({
      success: true,
      data: {
        overall: totalValue[0] || { totalValue: 0, totalBooks: 0, averageValue: 0 },
        byStatus,
        bySupplier
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================
// ROUTES (routes/reportRoutes.js)
// ============================================
/*
import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import * as reportController from '../controllers/reportController.js';

const router = express.Router();

// Dashboard
router.get('/dashboard', protect, reportController.getDashboardStats);

// Book Reports
router.get('/books/most-issued', protect, reportController.getMostIssuedBooks);
router.get('/books/by-status', protect, reportController.getBooksByStatus);
router.get('/books/lost', protect, reportController.getLostBooksReport);
router.get('/books/writeOff', protect, reportController.getWriteOffBooksReport);
// Member Reports
router.get('/members/by-type', protect, reportController.getMembersByType);
router.get('/members/by-course', protect, reportController.getMembersByCourse);
router.get('/members/by-year', protect, reportController.getMembersByYear);
router.get('/members/inactive', protect, reportController.getInactiveMembersReport);

// Transaction Reports
router.get('/transactions/daily', protect, reportController.getDailyTransactions);
router.get('/transactions/monthly', protect, reportController.getMonthlyTransactions);
router.get('/transactions/weekly', protect, reportController.getWeeklyTransactions);
router.get('/transactions/custom', protect, reportController.getCustomRangeTransactions);
router.get('/transactions/currently-issued', protect, reportController.getCurrentlyIssuedBooks);
router.get('/transactions/member/:memberId', protect, reportController.getMemberTransactionHistory);

// Financial Reports
router.get('/financial/book-value', protect, reportController.getBookValueReport);

export default router;
*/