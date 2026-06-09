import { relations } from "drizzle-orm";
import {
    boolean,
    index,
    integer,
    jsonb,
    pgTable,
    serial,
    text,
    timestamp,
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
        .notNull()
        .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
        .notNull()
        .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type HttpResponse = {
    url: string;
    status_code: number | string;
    redirect_path?: string[];
    message?: string;
    headers: Record<string, string | string[]>;
};

export const batches = pgTable(
    "batches",
    {
        id: serial("id").primaryKey(),
        userId: text("user_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
        devUrl: text("dev_url").notNull().default(""),
        screenshotUpdatedAt: timestamp("screenshot_updated_at"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at").notNull().defaultNow(),
        deletedAt: timestamp("deleted_at"),
    },
    (table) => ({
        userIdIdx: index("batches_user_id_idx").on(table.userId),
    }),
);

export const urls = pgTable(
    "urls",
    {
        id: serial("id").primaryKey(),
        batchId: integer("batch_id")
            .notNull()
            .references(() => batches.id, { onDelete: "cascade" }),
        url: text("url").notNull(),
        redirectTo: text("redirect_to"),
        httpResponse: jsonb("http_response").$type<HttpResponse>(),
        addressed: boolean("addressed").notNull().default(false),
        deletedAt: timestamp("deleted_at"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at").notNull().defaultNow(),
    },
    (table) => ({
        batchIdIdx: index("urls_batch_id_idx").on(table.batchId),
    }),
);

export const userRelations = relations(user, ({ many }) => ({
    batches: many(batches),
    sessions: many(session),
    accounts: many(account),
}));

export const batchesRelations = relations(batches, ({ one, many }) => ({
    user: one(user, {
        fields: [batches.userId],
        references: [user.id],
    }),
    urls: many(urls),
}));

export const urlsRelations = relations(urls, ({ one }) => ({
    batch: one(batches, {
        fields: [urls.batchId],
        references: [batches.id],
    }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
    user: one(user, {
        fields: [session.userId],
        references: [user.id],
    }),
}));

export const accountRelations = relations(account, ({ one }) => ({
    user: one(user, {
        fields: [account.userId],
        references: [user.id],
    }),
}));
