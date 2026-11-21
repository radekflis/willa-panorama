import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  jsonb,
  doublePrecision,
} from "drizzle-orm/pg-core";

export const userPlanEnum = pgEnum("user_plan", ["free", "start", "autopilot", "agency"]);
export const propertyStatusEnum = pgEnum("property_status", ["draft", "published", "sold", "archived"]);
export const aiOperationEnum = pgEnum("ai_operation", [
  "property_analysis",
  "contract_audit",
  "contract_generation",
  "3d_render",
  "listing_generation",
  "valuation_estimate",
  "home_staging_plan",
  "ocr_extraction",
  "location_analysis",
  "marketing_autopilot",
]);
export const aiStatusEnum = pgEnum("ai_status", ["success", "fallback", "failed"]);
export const pinStatusEnum = pgEnum("pin_status", ["active", "locked", "completed"]);
export const pinTypeEnum = pgEnum("pin_type", ["owner_offer", "buyer_request"]);
export const transactionTypeEnum = pgEnum("transaction_type", ["sale", "rent"]);
export const userRoleEnum = pgEnum("user_role", ["buyer", "owner", "agency"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull().unique(),
  fullName: text("full_name"),
  role: userRoleEnum("role").default("owner").notNull(),
  plan: userPlanEnum("plan").default("free").notNull(),
  stripeCustomerId: text("stripe_customer_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  ownerId: uuid("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const organizationMembers = pgTable("organization_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role").default("member").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const properties = pgTable("properties", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerId: uuid("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  city: text("city").notNull(),
  address: text("address").notNull(),
  pricePln: integer("price_pln").notNull(),
  areaSqm: numeric("area_sqm", { precision: 10, scale: 2 }).notNull(),
  rooms: integer("rooms").default(1).notNull(),
  status: propertyStatusEnum("status").default("draft").notNull(),
  lat: numeric("lat", { precision: 9, scale: 6 }),
  lng: numeric("lng", { precision: 9, scale: 6 }),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const propertyMedia = pgTable("property_media", {
  id: uuid("id").defaultRandom().primaryKey(),
  propertyId: uuid("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  storagePath: text("storage_path").notNull(),
  mediaType: text("media_type").default("image").notNull(),
  isCover: boolean("is_cover").default(false).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const creditWallets = pgTable("credit_wallets", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  orgId: uuid("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  balance: integer("balance").default(5).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const creditTransactions = pgTable("credit_transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  walletId: uuid("wallet_id").notNull().references(() => creditWallets.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  type: text("type").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const aiUsageEvents = pgTable("ai_usage_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  operation: aiOperationEnum("operation").notNull(),
  model: text("model").notNull(),
  status: aiStatusEnum("status").default("success").notNull(),
  tokensInput: integer("tokens_input").default(0).notNull(),
  tokensOutput: integer("tokens_output").default(0).notNull(),
  creditsCharged: integer("credits_charged").default(0).notNull(),
  costPlnEstimated: text("cost_pln_estimated").default("0").notNull(),
  latencyMs: integer("latency_ms").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  stripeSubscriptionId: text("stripe_subscription_id").notNull().unique(),
  plan: userPlanEnum("plan").notNull(),
  status: text("status").notNull(),
  currentPeriodEnd: timestamp("current_period_end"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const marketplacePins = pgTable("marketplace_pins", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerId: uuid("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  propertyId: uuid("property_id").references(() => properties.id, { onDelete: "set null" }),
  pinType: pinTypeEnum("pin_type").default("owner_offer").notNull(),
  transactionType: transactionTypeEnum("transaction_type").default("sale").notNull(),
  title: text("title").notNull(),
  city: text("city").notNull(),
  description: text("description").default("").notNull(),
  pricePln: integer("price_pln").notNull(),
  areaM2: integer("area_m2"),
  rooms: integer("rooms"),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  status: pinStatusEnum("status").default("active").notNull(),
  lockedByUserId: uuid("locked_by_user_id").references(() => users.id, { onDelete: "set null" }),
  lockedUntil: timestamp("locked_until"),
  contactPhone: text("contact_phone").default("").notNull(),
  contactEmail: text("contact_email").default("").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const directMessages = pgTable("direct_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  pinId: uuid("pin_id").notNull().references(() => marketplacePins.id, { onDelete: "cascade" }),
  senderId: uuid("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  receiverId: uuid("receiver_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const marketplacePinMessages = pgTable("marketplace_pin_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  pinId: uuid("pin_id").notNull().references(() => marketplacePins.id, { onDelete: "cascade" }),
  authorId: uuid("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const marketplacePinReviews = pgTable("marketplace_pin_reviews", {
  id: uuid("id").defaultRandom().primaryKey(),
  pinId: uuid("pin_id").notNull().references(() => marketplacePins.id, { onDelete: "cascade" }),
  reviewerId: uuid("reviewer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(),
  comment: text("comment").default("").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const auditLog = pgTable("audit_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  actorId: uuid("actor_id"),
  action: text("action").notNull(),
  resourceType: text("resource_type").notNull(),
  resourceId: text("resource_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
