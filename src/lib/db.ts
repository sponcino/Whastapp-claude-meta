import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "messages.db");

fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(DB_PATH);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT UNIQUE NOT NULL,
    name TEXT,
    mode TEXT CHECK(mode IN ('AI','HUMAN')) NOT NULL DEFAULT 'AI',
    last_message_at INTEGER,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id),
    role TEXT CHECK(role IN ('user','assistant','human')) NOT NULL,
    content TEXT NOT NULL,
    wa_message_id TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE INDEX IF NOT EXISTS idx_messages_conv
    ON messages(conversation_id, created_at);

  CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_wa_id
    ON messages(wa_message_id) WHERE wa_message_id IS NOT NULL;

  CREATE TABLE IF NOT EXISTS processed_webhook_messages (
    wa_message_id TEXT PRIMARY KEY,
    processed_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
`);

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface Conversation {
  id: number;
  phone: string;
  name: string | null;
  mode: "AI" | "HUMAN";
  last_message_at: number | null;
  created_at: number;
}

export interface ConversationWithPreview extends Conversation {
  last_message_preview: string | null;
}

export interface Message {
  id: number;
  conversation_id: number;
  role: "user" | "assistant" | "human";
  content: string;
  wa_message_id: string | null;
  created_at: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const stmtGetConvByPhone = db.prepare<[string]>(
  "SELECT * FROM conversations WHERE phone = ?"
);
const stmtInsertConv = db.prepare<[string, string | null]>(
  "INSERT INTO conversations (phone, name) VALUES (?, ?) RETURNING *"
);
const stmtUpdateConvName = db.prepare<[string | null, string]>(
  "UPDATE conversations SET name = ? WHERE phone = ?"
);

export function getOrCreateConversation(
  phone: string,
  name?: string | null
): Conversation {
  const existing = stmtGetConvByPhone.get(phone) as Conversation | undefined;
  if (existing) {
    if (name && name !== existing.name) {
      stmtUpdateConvName.run(name, phone);
      existing.name = name;
    }
    return existing;
  }
  const rows = stmtInsertConv.all(phone, name ?? null) as Conversation[];
  return rows[0];
}

const stmtGetConvById = db.prepare<[number]>(
  "SELECT * FROM conversations WHERE id = ?"
);

export function getConversationById(id: number): Conversation | null {
  return (stmtGetConvById.get(id) as Conversation | undefined) ?? null;
}

const insertMessageStmt = db.prepare<
  [number, string, string, string | null]
>(
  "INSERT INTO messages (conversation_id, role, content, wa_message_id) VALUES (?, ?, ?, ?) RETURNING id"
);
const updateLastMessageAt = db.prepare<[number]>(
  "UPDATE conversations SET last_message_at = unixepoch() WHERE id = ?"
);

const insertMessageTx = db.transaction(
  (
    conversationId: number,
    role: string,
    content: string,
    waMessageId: string | null
  ): number => {
    const row = insertMessageStmt.get(
      conversationId,
      role,
      content,
      waMessageId
    ) as { id: number };
    updateLastMessageAt.run(conversationId);
    return row.id;
  }
);

export function insertMessage(
  conversationId: number,
  role: "user" | "assistant" | "human",
  content: string,
  waMessageId?: string | null
): number {
  return insertMessageTx(conversationId, role, content, waMessageId ?? null);
}

const stmtUpdateWaId = db.prepare<[string, number]>(
  "UPDATE messages SET wa_message_id = ? WHERE id = ?"
);

export function updateMessageWaId(messageId: number, waMessageId: string): void {
  stmtUpdateWaId.run(waMessageId, messageId);
}

const stmtGetMessages = db.prepare<[number, number]>(
  "SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC LIMIT ?"
);

export function getMessages(conversationId: number, limit = 50): Message[] {
  return stmtGetMessages.all(conversationId, limit) as Message[];
}

const stmtGetRecentHistoryDesc = db.prepare<[number, number]>(
  "SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT ?"
);

export function getRecentHistory(
  conversationId: number,
  limit = 20
): Message[] {
  const rows = stmtGetRecentHistoryDesc.all(conversationId, limit) as Message[];
  return rows.reverse();
}

const stmtSetMode = db.prepare<[string, number]>(
  "UPDATE conversations SET mode = ? WHERE id = ?"
);

export function setMode(conversationId: number, mode: "AI" | "HUMAN"): void {
  stmtSetMode.run(mode, conversationId);
}

const stmtListConversations = db.prepare(`
  SELECT
    c.*,
    (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message_preview
  FROM conversations c
  ORDER BY c.last_message_at DESC NULLS LAST, c.created_at DESC
`);

export function listConversations(): ConversationWithPreview[] {
  return stmtListConversations.all() as ConversationWithPreview[];
}

const deleteMessagesTx = db.transaction((id: number) => {
  db.prepare("DELETE FROM messages WHERE conversation_id = ?").run(id);
  db.prepare("DELETE FROM conversations WHERE id = ?").run(id);
});

export function deleteConversation(id: number): void {
  deleteMessagesTx(id);
}

const stmtWasProcessed = db.prepare<[string]>(
  "SELECT 1 FROM processed_webhook_messages WHERE wa_message_id = ?"
);

export function wasMessageProcessed(waMessageId: string): boolean {
  return !!stmtWasProcessed.get(waMessageId);
}

const stmtMarkProcessed = db.prepare<[string]>(
  "INSERT OR IGNORE INTO processed_webhook_messages (wa_message_id) VALUES (?)"
);

export function markMessageProcessed(waMessageId: string): void {
  stmtMarkProcessed.run(waMessageId);
}
