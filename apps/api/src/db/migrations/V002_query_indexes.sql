CREATE INDEX idx_user_words_synced ON user_words (user_id, synced_at);
CREATE INDEX idx_review_logs_received ON review_logs (user_id, received_at);
CREATE INDEX idx_review_logs_word ON review_logs (user_id, word_id);
CREATE INDEX idx_day_stats_updated ON day_stats (user_id, updated_at);
