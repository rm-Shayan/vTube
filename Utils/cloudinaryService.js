import { v2 as Cloudinary } from "cloudinary";
import path from "path";
import fs from "fs";

// Cloudinary Config
Cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET_KEY,
});

export const uploadToCloudinary = async (localFile) => {
  if (!localFile) throw new Error("File path not defined. Unable to find file.");

  try {
    // Check file extension
    const ext = path.extname(localFile).toLowerCase();
    let folderName = "";

    if ([".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext)) {
      folderName = "vTube/images"; // images folder
    } else if ([".mp4", ".mov", ".avi", ".mkv"].includes(ext)) {
      folderName = "vTube/videos"; // videos folder
    } else {
      throw new Error("Unsupported file type");
    }

    // Upload to Cloudinary
    const result = await Cloudinary.uploader.upload(localFile, {
      folder: folderName,
      resource_type: "auto", // auto detect image/video
    });

    console.log("Upload Successful:", result);

    // Delete local temp file after successful upload
    fs.unlink(localFile, (err) => {
      if (err) console.error("Failed to delete temp file:", err);
    });

    return  {
  url: result.secure_url,
  public_id: result.public_id,
};
  } catch (error) {
    console.error("Upload Error:", error);


    // Cleanup if upload fails
    fs.unlink(localFile, (err) => {
      if (err) console.error("Failed to delete temp file:", err);
    });

    throw error;
  }
};
