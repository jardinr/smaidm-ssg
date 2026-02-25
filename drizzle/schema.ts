import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Audit lead capture — every audit submission is stored here for follow-up
export const auditLeads = mysqlTable("audit_leads", {
  id: int("id").autoincrement().primaryKey(),
  url: varchar("url", { length: 2048 }).notNull(),
  businessName: varchar("businessName", { length: 255 }),
  email: varchar("email", { length: 320 }),
  overallScore: int("overallScore"),
  seoScore: int("seoScore"),
  sgoScore: int("sgoScore"),
  geoScore: int("geoScore"),
  tier: varchar("tier", { length: 64 }),
  isDemoMode: int("isDemoMode").default(0).notNull(), // 0 = live, 1 = demo
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLead = typeof auditLeads.$inferSelect;
export type InsertAuditLead = typeof auditLeads.$inferInsert;