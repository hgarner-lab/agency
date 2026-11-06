CREATE TABLE IF NOT EXISTS arcade_rooms (code TEXT PRIMARY KEY, host_hash TEXT NOT NULL, phase TEXT NOT NULL DEFAULT 'lobby', duration INTEGER NOT NULL DEFAULT 300, deadline INTEGER, remaining INTEGER, target INTEGER NOT NULL DEFAULT 4, revision INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS arcade_players (id TEXT PRIMARY KEY, room TEXT NOT NULL REFERENCES arcade_rooms(code), alias TEXT NOT NULL, token_hash TEXT NOT NULL, character INTEGER NOT NULL DEFAULT 0, game TEXT NOT NULL, seq INTEGER NOT NULL DEFAULT 0, credit REAL NOT NULL DEFAULT 8, updated_at INTEGER NOT NULL, joined_at INTEGER NOT NULL, finished INTEGER NOT NULL DEFAULT 0);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS arcade_alias ON arcade_players(room,lower(alias));
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS arcade_player_room ON arcade_players(room);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS arcade_events (id TEXT PRIMARY KEY, room TEXT NOT NULL REFERENCES arcade_rooms(code), player TEXT NOT NULL REFERENCES arcade_players(id), alias TEXT NOT NULL, character INTEGER NOT NULL, type INTEGER NOT NULL, detail TEXT NOT NULL, points INTEGER NOT NULL, poster TEXT, created_at INTEGER NOT NULL);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS arcade_event_room ON arcade_events(room,created_at);
