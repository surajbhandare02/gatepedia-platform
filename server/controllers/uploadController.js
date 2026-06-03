const multer = require("multer");
const pool = require("../db");
const { upload } = require("../config/env");
const uploadService = require("../services/uploadService");

const pdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: upload.maxPdfMb * 1024 * 1024,
  },
});

async function uploadSyllabus(req, res, next) {
  try {
    const data = await uploadService.extractAndStorePdf(req.user.id, req.file);
    res.status(201).json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

async function uploadAttachment(req, res, next) {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: "Upload a file" });
      return;
    }

    const result = await pool.query(
      `INSERT INTO attachments
         (user_id, topic_id, filename, file_type, extracted_text)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, topic_id, filename, file_type, file_url, created_at`,
      [
        req.user.id,
        req.body.topic_id || null,
        req.file.originalname,
        req.file.mimetype,
        "",
      ]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (e) {
    next(e);
  }
}

async function extractNotesText(req, res, next) {
  try {
    const data = await uploadService.extractPdfText(req.file);
    res.status(200).json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

module.exports = {
  pdfUpload,
  uploadSyllabus,
  uploadAttachment,
  extractNotesText,
};
