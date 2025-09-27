import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import memberRoutes from "./routes/memberRoutes.js";
import membershipRequestRoutes from "./routes/membershipRequestRoutes.js";
import bookRoutes from "./routes/bookRoutes.js";
import transactionRoutes from "./routes/transactionRoutes.js";

dotenv.config();
connectDB();
const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/members", memberRoutes);
app.use("/api/membership-requests", membershipRequestRoutes);
app.use("/api/books", bookRoutes);
app.use("/api//transactions", transactionRoutes);

// Test route
app.get("/", (req, res) => {
  res.send("Library Backend Running 🚀");
});

export default app;
