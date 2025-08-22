import multer from "multer";
import path from "path";
import fs from "fs";
import { ApiError } from "../Utils/ApiError.js"; // if you're using your custom error

const __dirname = path.resolve();
const publicPath = path.join(__dirname, "Public");

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folderPath;

    if (file.mimetype.startsWith("image/")) {
      folderPath = path.join(publicPath,"Temp" , "images");
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

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/") || file.mimetype.startsWith("video/")) {
    cb(null, true);
  } else {
    cb(new ApiError(400, "Only images and videos are allowed"), false);
  }
};

export const fileUploadHandler = multer({
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB max
});
