import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";

dotenv.config();
connectDB();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Routes

// Test route
app.get("/", (req, res) => {
  res.send("Library Backend Running 🚀");
});

export default app;
