import multer from "multer";
import path from "path";
import fs from "fs";
import { ApiError } from "../Utils/ApiError.js"; // agar custom error use kar rahe ho

const __dirname = path.resolve();
const publicPath = path.join(__dirname, "Public");

// Folder ensure helper
const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folderPath;

    if (file.mimetype.startsWith("image/")) {
      folderPath = path.join(publicPath, "Temp", "images");
    } else if (file.mimetype.startsWith("video/")) {
      folderPath = path.join(publicPath, "Temp", "videos");
    } else {
      return cb(new ApiError(400, "Only images and videos are allowed"), false);
    }

    ensureDir(folderPath);
    cb(null, folderPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${file.fieldname}${ext}`);
  },
});

const allowedMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/jpg",
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/avi",
  "video/mkv",
  "video/quicktime",
  "video/x-matroska",
];

const fileFilter = (req, file, cb) => {
  console.log("Uploaded file MIME type:", file.mimetype);
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ApiError(400, `Unsupported file type: ${file.mimetype}`), false);
  }
};

export const fileUploadHandler = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB max
});

// ✅ Different field configs
export const uploadUserMedia = fileUploadHandler.fields([
  { name: "avatar", maxCount: 1 },
  { name: "coverImage", maxCount: 1 },
]);

export const uploadVideoMedia = fileUploadHandler.fields([
  { name: "video", maxCount: 1 },
  { name: "thumbnail", maxCount: 1 },
]);
