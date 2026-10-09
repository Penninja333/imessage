import multer from "multer";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25mb

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    // Disallow dangerous executable formats
    const blockedExtensions = [".exe", ".bat", ".cmd", ".sh", ".com", ".msi", ".vbs", ".scr", ".pif"];
    const ext = file.originalname ? file.originalname.slice(file.originalname.lastIndexOf(".")).toLowerCase() : "";
    if (blockedExtensions.includes(ext)) {
      cb(new Error("Executable file formats are not permitted for security"));
      return;
    }

    cb(null, true);
  },
});
