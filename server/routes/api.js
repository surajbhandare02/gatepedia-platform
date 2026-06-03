const express = require("express");
const authController = require("../controllers/authController");
const progressController = require("../controllers/progressController");
const { getAnalytics } = require("../controllers/analyticsController");
const syllabusController = require("../controllers/syllabusController");
const uploadController = require("../controllers/uploadController");
const intelligenceController = require("../controllers/intelligenceController");
const revisionController = require("../controllers/revisionController");
const productivityController = require("../controllers/productivityController");
const flashcardController = require("../controllers/flashcardController");
const profileController = require("../controllers/profileController");
const notificationController = require("../controllers/notificationController");
const assistantController = require("../controllers/assistantController");
const adminController = require("../controllers/adminController");
const aiController = require("../controllers/aiController");
const healthController = require("../controllers/healthController");
const { requireAuth } = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/rbacMiddleware");
const {
  authRateLimiter,
  generateCsrfToken,
} = require("../middleware/securityMiddleware");
const { cacheResponse } = require("../middleware/cacheMiddleware");
const { validateRequest } = require("../middleware/validate");
const authValidator = require("../validators/authValidator");

const router = express.Router();

router.get("/health", healthController.basic);
router.get("/health/deep", healthController.deep);
router.get("/metrics", requireAuth, requireRole("admin"), healthController.getMetrics);

router.get("/security/csrf-token", (req, res) => {
  res.json({ success: true, data: { csrfToken: generateCsrfToken(res) } });
});

router.post("/auth/register", authRateLimiter, validateRequest(authValidator.registerSchema), authController.register);
router.post("/auth/login", authRateLimiter, validateRequest(authValidator.loginSchema), authController.login);
router.post("/auth/refresh", authRateLimiter, authController.refresh);
router.post("/auth/logout", authController.logout);
router.post(
  "/auth/password-reset/request",
  authRateLimiter,
  validateRequest(authValidator.resetPasswordRequestSchema),
  authController.requestPasswordReset
);
router.post("/auth/password-reset/confirm", authRateLimiter, validateRequest(authValidator.resetPasswordSchema), authController.resetPassword);
router.post("/auth/email/verify", authController.verifyEmail);
router.get("/auth/oauth/:provider", authController.oauthStatus);
router.get("/auth/me", requireAuth, authController.me);

router.use(requireAuth);

router.post("/auth/email/request-verification", authController.requestEmailVerification);
router.post("/auth/2fa/setup", authController.setupMfa);
router.post("/auth/2fa/verify", authController.verifyMfa);

router.get("/profile", profileController.getProfile);
router.put("/profile", profileController.updateProfile);

router.get("/progress", progressController.listProgress);
router.post("/progress", progressController.createProgress);
router.put("/progress/:id", progressController.updateProgress);
router.delete("/progress/:id", progressController.deleteProgress);

router.get("/analytics", cacheResponse(45), getAnalytics);
router.get("/subjects", syllabusController.listSubjects);
router.put("/topics/:topicId/progress", syllabusController.updateTopicProgress);
router.put("/topics/:topicId/pyq", syllabusController.updatePyq);
router.put("/topics/:topicId/notes", syllabusController.updateNotes);
router.put("/topics/:topicId/weak-topic", syllabusController.updateWeakTopic);
router.post("/topics/:topicId/revisions", syllabusController.createRevision);

router.get("/planner", cacheResponse(45), intelligenceController.getPlanner);
router.get(
  "/insights/performance",
  cacheResponse(45),
  intelligenceController.getPerformanceInsights
);
router.get("/insights/pyq", cacheResponse(45), intelligenceController.getPyqAnalyzer);

router.post("/ai/topics/:topicId/explain", aiController.explainTopic);
router.post("/ai/topics/:topicId/quiz", aiController.generateQuiz);
router.post("/ai/topics/:topicId/flashcards", aiController.generateFlashcards);
router.get("/ai/recommendations", cacheResponse(60), aiController.recommendations);
router.post("/ai/notes/summarize", aiController.summarizeNotes);

router.post("/revision/generate", revisionController.generateSchedule);
router.get("/revision/calendar", revisionController.getCalendar);
router.put("/revision/:id/complete", revisionController.completeRevision);

router.post("/flashcards", flashcardController.createFlashcard);
router.get("/flashcards", flashcardController.listFlashcards);
router.get("/flashcards/due", flashcardController.getDueFlashcards);
router.put("/flashcards/:id/review", flashcardController.reviewFlashcard);
router.delete("/flashcards/:id", flashcardController.deleteFlashcard);

router.get("/productivity", productivityController.dashboard);
router.post("/goals", productivityController.createGoal);
router.put("/goals/:id", productivityController.updateGoal);
router.post("/focus-sessions", productivityController.createFocusSession);
router.put("/focus-sessions/:id/complete", productivityController.completeFocusSession);

router.get("/notifications", notificationController.list);
router.put("/notifications/:id/read", notificationController.markRead);

router.get("/assistant/history", assistantController.history);
router.post("/assistant/chat", assistantController.chat);

router.get("/admin/overview", requireRole("admin"), adminController.overview);

router.post(
  "/uploads/syllabus",
  uploadController.pdfUpload.single("syllabus"),
  uploadController.uploadSyllabus
);
router.post(
  "/uploads/attachments",
  uploadController.pdfUpload.single("attachment"),
  uploadController.uploadAttachment
);
router.post(
  "/uploads/notes-text",
  uploadController.pdfUpload.single("notes"),
  uploadController.extractNotesText
);

module.exports = router;
