import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import userRoute from "./Routes/user.route.js";
import { ApiErrorMiddleware } from "./Middlewares/ApiError.middleware.js";
import refreshRouter from "./Routes/refresh.route.js";

export const app = express();

// CORS setup
app.use(cors({
  origin: "http://localhost:3000", // React frontend URL
  credentials: true,
}));

// Cookie parser
app.use(cookieParser());

// Body parsers
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.set('view engine',"ejs")
// Routes
app.use("/api/v1/user", userRoute);
app.get("/",(req,res)=>{
res.render('index')
})

app.use("/api/v1/token",refreshRouter)
app.get("/register",(req,res)=>{
res.render('register')
})


// Error handling middleware (must be last)
app.use(ApiErrorMiddleware);
