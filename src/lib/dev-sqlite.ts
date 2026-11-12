/* eslint-disable @typescript-eslint/no-explicit-any */
// Local-development fallbacks for the Cloudflare bindings.
//
// `workerd` cannot always run (on Windows it needs a current VC++ runtime), so plain
// `npm run dev` is supported too: when there is no Cloudflare context we emulate the
// small slice of the D1 / R2 APIs this app uses on top of Node's built-in SQLite and
// the local filesystem.
//
// Everything lives under `.dev/` (git-ignored). Production always uses the real bindings.
//
// NOTE: no top-level `node:*` imports and no builtin access at module load time, so that
// importing this file inside the Cloudflare worker bundle stays inert.

type SqlValue = string | number | null | bigint | Uint8Array;

type DevStatement = {
  bind: (...values: any[]) => DevStatement;
  first: <T = any>() => Promise<T | null>;
  all: <T = any>() => Promise<{ results: T[]; success: true; meta: Record<string, unknown> }>;
  run: () => Promise<{ success: true; results: never[]; meta: { changes: number; last_row_id: number } }>;
};

export type DevD1 = { prepare: (sql: string) => DevStatement };

const globalStore = globalThis as any;

function builtin<T>(name: string): T {
  const proc = process as any;
  if (typeof proc.getBuiltinModule === "function") return proc.getBuiltinModule(name) as T;
  throw new Error(`DEV_RUNTIME_UNAVAILABLE: ${name}`);
}

const fs = () => builtin<typeof import("node:fs")>("node:fs");
const nodePath = () => builtin<typeof import("node:path")>("node:path");

const devDir = () => nodePath().join(process.cwd(), ".dev");
const dbFile = () => nodePath().join(devDir(), "d1.sqlite");
const storageDir = () => nodePath().join(devDir(), "storage");

function normalize(value: any): SqlValue {
  if (value === undefined) return null;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (value instanceof Date) return value.toISOString();
  return value;
}

function openDatabase(): any {
  const { DatabaseSync } = builtin<any>("node:sqlite");
  fs().mkdirSync(devDir(), { recursive: true });
  const db = new DatabaseSync(dbFile());
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");

  const ready = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'users'")
    .get();

  if (!ready) {
    const dir = nodePath().join(process.cwd(), "migrations", "d1");
    for (const file of ["0001_init.sql", "0002_seed.sql"]) {
      db.exec(fs().readFileSync(nodePath().join(dir, file), "utf8"));
    }
    // eslint-disable-next-line no-console
    console.log(`[dev-db] initialized ${dbFile()} from migrations/d1`);
  }

  return db;
}

function createD1(): DevD1 {
  const sqlite = openDatabase();
  const cache = new Map<string, any>();

  const statement = (sql: string) => {
    let stmt = cache.get(sql);
    if (!stmt) {
      stmt = sqlite.prepare(sql);
      cache.set(sql, stmt);
    }
    return stmt;
  };

  const wrap = (sql: string, params: any[]): DevStatement => ({
    bind: (...values: any[]) => wrap(sql, values.map(normalize)),
    // node:sqlite returns null-prototype objects, which React cannot serialize to
    // client components. Copy every row into a plain object.
    first: async () => {
      const row = statement(sql).get(...params);
      return (row ? { ...row } : null) as any;
    },
    all: async () => {
      const results = statement(sql)
        .all(...params)
        .map((row: any) => ({ ...row }));
      return { results, success: true as const, meta: {} };
    },
    run: async () => {
      const result = statement(sql).run(...params);
      return {
        success: true as const,
        results: [] as never[],
        meta: {
          changes: Number(result.changes),
          last_row_id: Number(result.lastInsertRowid),
        },
      };
    },
  });

  return { prepare: (sql: string) => wrap(sql, []) };
}

/** Turn an object key into a safe relative path (Windows forbids : * ? " < > |). */
function safeRelativeKey(key: string): string {
  return key
    .replace(/\\/g, "/")
    .split("/")
    .filter((part) => part && part !== "." && part !== "..")
    .map((part) => part.replace(/[<>:"|?*\u0000-\u001f]/g, "_"))
    .join("/");
}

function createStorage() {
  fs().mkdirSync(storageDir(), { recursive: true });

  return {
    put: async (
      key: string,
      data: ArrayBuffer | ArrayBufferView | string,
      options?: { httpMetadata?: { contentType?: string } },
    ) => {
      const rel = safeRelativeKey(key);
      const target = nodePath().join(storageDir(), rel);
      fs().mkdirSync(nodePath().dirname(target), { recursive: true });

      const buffer =
        typeof data === "string"
          ? Buffer.from(data)
          : Buffer.from(data instanceof ArrayBuffer ? data : (data as ArrayBufferView).buffer);

      fs().writeFileSync(target, buffer);
      fs().writeFileSync(
        `${target}.meta.json`,
        JSON.stringify({
          contentType: options?.httpMetadata?.contentType ?? "application/octet-stream",
        }),
      );

      return { key: rel, size: buffer.byteLength, etag: `"${buffer.byteLength}-${Date.now()}"` };
    },

    get: async (key: string) => {
      const rel = safeRelativeKey(key);
      const target = nodePath().join(storageDir(), rel);
      if (!fs().existsSync(target)) return null;

      const buffer = fs().readFileSync(target);
      let contentType = "application/octet-stream";
      try {
        contentType = JSON.parse(fs().readFileSync(`${target}.meta.json`, "utf8")).contentType;
      } catch {
        // no metadata sidecar – fall back to octet-stream
      }

      return {
        key: rel,
        body: buffer,
        httpEtag: `"${buffer.byteLength}-${fs().statSync(target).mtimeMs}"`,
        writeHttpMetadata: (headers: Headers) => {
          headers.set("content-type", contentType);
        },
      };
    },
  };
}

export function getDevDB(): DevD1 {
  if (!globalStore.__devD1) globalStore.__devD1 = createD1();
  return globalStore.__devD1 as DevD1;
}

export function getDevStorage() {
  if (!globalStore.__devStorage) globalStore.__devStorage = createStorage();
  return globalStore.__devStorage as ReturnType<typeof createStorage>;
}
