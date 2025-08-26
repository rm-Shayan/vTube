import { v2 as Cloudinary } from "cloudinary";
import path from "path";
import fs from "fs/promises"; // use promises for async/await

// Cloudinary Config
Cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET_KEY,
});

/**
 * Upload a local file to Cloudinary
 * @param {string} localFile - Path to the local file
 * @returns {Object} - { url, public_id, type }
 */
export const uploadToCloudinary = async (localFile) => {
  if (!localFile) throw new Error("File path not defined. Unable to find file.");

  const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
  const videoExtensions = [".mp4", ".mov", ".avi", ".mkv", ".webm", ".ogg"];

  try {
    // Determine file type and folder
    const ext = path.extname(localFile).toLowerCase();
    let folderName, type;

    if (imageExtensions.includes(ext)) {
      folderName = "vTube/images";
      type = "image";
    } else if (videoExtensions.includes(ext)) {
      folderName = "vTube/videos";
      type = "video";
    } else {
      throw new Error("Unsupported file type: " + ext);
    }

    // Upload to Cloudinary
    const result = await Cloudinary.uploader.upload(localFile, {
      folder: folderName,
      resource_type: "auto", // automatically detect image/video
    });

    console.log("Upload Successful:", result);

    // Delete local temp file after successful upload
    await fs.unlink(localFile).catch((err) => {
      console.error("Failed to delete temp file:", err);
    });

   return {
  url: result.secure_url,
  public_id: result.public_id,
  type,          // "video" ya "image"
  duration: result.duration // Cloudinary automatically provide karti hai video ke liye
};

  } catch (error) {
    console.error("Upload Error:", error);

    // Cleanup local file on error
    await fs.unlink(localFile).catch((err) => {
      console.error("Failed to delete temp file after error:", err);
    });

    throw error;
  }
};

/**
 * Delete a file from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @param {string} resourceType - "image" or "video"
 * @returns {Object} - Cloudinary delete result
 */
export const deleteFromCloudinary = async (publicId, resourceType = "image") => {
  if (!publicId) throw new Error("Public ID not provided for deletion");

  try {
    const result = await Cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType, // "image" or "video"
    });

    console.log("Delete Successful:", result);
    return result;
  } catch (error) {
    console.error("Delete Error:", error);
    throw error;
  }
};
