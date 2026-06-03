-- CreateIndex
CREATE INDEX "idx_flashcards_user_review" ON "flashcards"("user_id", "next_review_date");

-- CreateIndex
CREATE INDEX "idx_study_sessions_user_date" ON "study_sessions"("user_id", "started_at" DESC);
