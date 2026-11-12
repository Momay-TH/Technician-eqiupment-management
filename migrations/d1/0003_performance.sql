-- Technician Equipment Management — Cloudflare D1
-- Migration 0003: performance indexes for hot queries.

CREATE INDEX IF NOT EXISTS equipment_archive_status_idx ON equipment (is_archived, status);
CREATE INDEX IF NOT EXISTS equipment_history_created_idx ON equipment_history (created_at);

CREATE INDEX IF NOT EXISTS checkout_requests_status_created_idx ON checkout_requests (status, created_at);
CREATE INDEX IF NOT EXISTS checkout_request_items_request_status_idx ON checkout_request_items (request_id, status);

CREATE INDEX IF NOT EXISTS notifications_user_read_idx ON notifications (user_id, is_read);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id);
