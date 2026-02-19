import { resolve } from "path";
import { existsSync, mkdirSync } from "fs";
import multer from "multer";
import { fileURLToPath } from "url";
import path from "path";

// Get the directory name for the ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create directories if they don't exist
const uploadDir = resolve(__dirname, "../../../uploads");
const imageDir = resolve(uploadDir, "images");
const fileDir = resolve(uploadDir, "files");

if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });
if (!existsSync(imageDir)) mkdirSync(imageDir, { recursive: true });
if (!existsSync(fileDir)) mkdirSync(fileDir, { recursive: true });

// Set up storage engine for multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.mimetype.startsWith("image/")) {
      cb(null, imageDir);
    } else {
      cb(null, fileDir);
    }
  },
  filename: function (req, file, cb) {
    const randomName = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + randomName + "-" + file.originalname);
  },
});

// Create the base multer instance
const upload = multer({ storage });

// Custom fields upload function
const multerUpload = (fields) => upload.fields(fields);


// Export both options
export { upload, multerUpload };
