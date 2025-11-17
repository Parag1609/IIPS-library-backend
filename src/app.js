import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import memberRoutes from "./routes/memberRoutes.js";
import membershipRequestRoutes from "./routes/membershipRequestRoutes.js";
import bookRoutes from "./routes/bookRoutes.js";
import transactionRoutes from "./routes/transactionRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import { protect } from './middleware/auth.js';

dotenv.config();
connectDB();
const app = express();

// Middlewares
app.use(cors());
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use("/api/members",protect, memberRoutes);
app.use("/api/membership-requests",protect, membershipRequestRoutes);
app.use("/api/books",protect, bookRoutes);
app.use("/api/transactions",protect, transactionRoutes);
app.use("/api/reports",protect,reportRoutes);

// Test route
app.get("/", (req, res) => {
  res.send("Library Backend Running 🚀");
});

export default app;
