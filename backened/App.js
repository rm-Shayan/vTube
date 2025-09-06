import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import userRoute from "./Routes/user.route.js";
import { ApiErrorMiddleware } from "./Middlewares/ApiError.middleware.js";
import refreshRouter from "./Routes/refresh.route.js";
import followerRoute from "./Routes/follower.route.js"
import videoRoute from "./Routes/videos.route.js";
import commentRoute from "./Routes/comment.route.js"
import watchHistoryRoute from "./Routes/watchHistory.route.js"
export const app = express();

// CORS setup
const allowedOrigins = [
  "http://localhost:5600",                  // dev frontend
  "https://vtube-production.up.railway.app", // production frontend
  "http://localhost:5173"
];

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (like Postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        const msg = `The CORS policy for this site does not allow access from the specified Origin.`;
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    credentials: true, // allow cookies
  })
);


// Cookie parser
app.use(cookieParser());

// Body parsers
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.set("view engine", "ejs");
// Routes

app.use("/api/v1/user", userRoute);
app.get("/", (req, res) => {
  res.render("index");
});
app.get("/login",(req,res)=>{
  res.render("login")
})

app.use("/api/v1/video", videoRoute);

app.use("/api/v1/token", refreshRouter);

app.use('/api/v1/follow',followerRoute)


app.use("/api/v1/comment",commentRoute)

app.get("/register", (req, res) => {
  res.render("register");
});

app.get("/profile",(req,res)=>{
  res.render("profile")
})
app.get("/comment",(req,res)=>{
  res.render("comment")
})

app.use("/api/v1/watchHistory", watchHistoryRoute);
app.use(ApiErrorMiddleware);
// Error handling middleware (must be last)
