import { count, desc, eq, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertAuditLead, InsertUser, auditLeads, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Insert an audit lead record (called after every audit submission)
export async function insertAuditLead(lead: InsertAuditLead): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot insert audit lead: database not available");
    return;
  }
  try {
    await db.insert(auditLeads).values(lead);
  } catch (error) {
    console.error("[Database] Failed to insert audit lead:", error);
    // Non-fatal: don't block the audit response if DB write fails
  }
}

// Retrieve all audit leads with pagination and optional search (for admin dashboard)
export async function getAuditLeads(opts: {
  limit?: number;
  offset?: number;
  search?: string;
} = {}) {
  const db = await getDb();
  if (!db) return { leads: [], total: 0 };

  const { limit = 50, offset = 0, search } = opts;

  const whereClause = search
    ? or(
        like(auditLeads.url, `%${search}%`),
        like(auditLeads.businessName, `%${search}%`),
        like(auditLeads.contactName, `%${search}%`),
        like(auditLeads.email, `%${search}%`),
      )
    : undefined;

  const [leads, totalResult] = await Promise.all([
    whereClause
      ? db.select().from(auditLeads).where(whereClause).orderBy(desc(auditLeads.createdAt)).limit(limit).offset(offset)
      : db.select().from(auditLeads).orderBy(desc(auditLeads.createdAt)).limit(limit).offset(offset),
    whereClause
      ? db.select({ count: count() }).from(auditLeads).where(whereClause)
      : db.select({ count: count() }).from(auditLeads),
  ]);

  return { leads, total: totalResult[0]?.count ?? 0 };
}

// Delete a single audit lead by ID
export async function deleteAuditLead(id: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot delete audit lead: database not available");
    return;
  }
  await db.delete(auditLeads).where(eq(auditLeads.id, id));
}

// Per-day audit volume and average score for the past N days (for trend chart)
export async function getDailyStats(days = 30) {
  const db = await getDb();
  if (!db) return [];

  // Build a result set: one row per calendar day for the past `days` days.
  // We use DATE() to bucket by day in the DB timezone (UTC).
  const rows = await db
    .select({
      day: sql<string>`DATE(${auditLeads.createdAt})`,
      count: count(),
      avgScore: sql<number | null>`AVG(CASE WHEN ${auditLeads.isDemoMode} = 0 THEN ${auditLeads.overallScore} END)`,
    })
    .from(auditLeads)
    .where(sql`${auditLeads.createdAt} >= DATE_SUB(NOW(), INTERVAL ${days} DAY)`)
    .groupBy(sql`DATE(${auditLeads.createdAt})`);

  // Fill in missing days with zero so the chart has a continuous x-axis.
  const map = new Map(rows.map(r => [r.day, r]));
  const result: Array<{ day: string; count: number; avgScore: number | null }> = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
    const row = map.get(key);
    result.push({
      day: key,
      count: row ? Number(row.count) : 0,
      avgScore: row?.avgScore != null ? Math.round(Number(row.avgScore)) : null,
    });
  }

  return result;
}

// Aggregate stats for the admin dashboard header cards
export async function getAuditLeadStats() {
  const db = await getDb();
  if (!db) return { total: 0, withContact: 0, liveAudits: 0, avgScore: null };

  const [totalRes, contactRes, liveRes, avgRes] = await Promise.all([
    db.select({ count: count() }).from(auditLeads),
    db.select({ count: count() }).from(auditLeads).where(
      sql`${auditLeads.email} IS NOT NULL OR ${auditLeads.phone} IS NOT NULL`
    ),
    db.select({ count: count() }).from(auditLeads).where(eq(auditLeads.isDemoMode, 0)),
    db.select({ avg: sql<number>`AVG(${auditLeads.overallScore})` }).from(auditLeads).where(
      sql`${auditLeads.overallScore} IS NOT NULL AND ${auditLeads.isDemoMode} = 0`
    ),
  ]);

  return {
    total: totalRes[0]?.count ?? 0,
    withContact: contactRes[0]?.count ?? 0,
    liveAudits: liveRes[0]?.count ?? 0,
    avgScore: avgRes[0]?.avg ? Math.round(Number(avgRes[0].avg)) : null,
  };
}
