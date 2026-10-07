import {
  sqliteTable,
  text,
  integer,
  primaryKey,
  uniqueIndex,
  index,
} from "drizzle-orm/sqlite-core";
export const workspaces = sqliteTable("workspaces", {
  id: text("id").primaryKey(),
  created: text("created").notNull(),
});
export const festivals = sqliteTable(
  "festivals",
  {
    workspace: text("workspace").notNull(),
    id: text("id").notNull(),
    data: text("data").notNull(),
  },
  (t) => [primaryKey({ columns: [t.workspace, t.id] })],
);
export const clubEvents = sqliteTable(
  "events",
  {
    workspace: text("workspace").notNull(),
    id: text("id").notNull(),
    festId: text("fest_id").notNull(),
    data: text("data").notNull(),
    capacity: integer("capacity").notNull(),
    deadline: text("deadline").notNull(),
    start: text("start").notNull(),
    end: text("end").notNull(),
  },
  (t) => [primaryKey({ columns: [t.workspace, t.id] })],
);
export const registrations = sqliteTable(
  "registrations",
  {
    id: text("id").primaryKey(),
    workspace: text("workspace").notNull(),
    eventId: text("event_id").notNull(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    institution: text("institution").notNull(),
    status: text("status").notNull(),
    ownerUid: text("owner_uid"),
    own: integer("own").notNull().default(0),
    created: text("created").notNull(),
    teamId: text("team_id"),
    teamName: text("team_name").notNull().default(""),
    members: text("members").notNull().default("[]"),
    trxId: text("trx_id").notNull().default(""),
    payment: text("payment").notNull().default("{}"),
  },
  (t) => [
    uniqueIndex("registration_identity").on(t.workspace, t.eventId, t.email),
    index("registration_owner").on(t.workspace, t.ownerUid),
    index("registration_workspace_event").on(t.workspace, t.eventId, t.status),
  ],
);
export const directory = sqliteTable("directory", {
  uid: text("uid").primaryKey(),
  name: text("name").notNull(),
  searchable: integer("searchable").notNull().default(1),
});
export const teams = sqliteTable("teams", {
  id: text("id").primaryKey(),
  eventId: text("event_id").notNull(),
  leader: text("leader").notNull(),
  name: text("name").notNull(),
  created: text("created").notNull(),
});
export const teamMembers = sqliteTable(
  "team_members",
  {
    teamId: text("team_id").notNull(),
    uid: text("uid").notNull(),
    name: text("name").notNull(),
    status: text("status").notNull(),
    updated: text("updated").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.teamId, t.uid] }),
    index("member_inbox").on(t.uid, t.status),
  ],
);
export const pushSubscriptions = sqliteTable("push_subscriptions", {
  endpoint: text("endpoint").primaryKey(),
  uid: text("uid").notNull(),
  subscription: text("subscription").notNull(),
  updated: text("updated").notNull(),
});
export const pushDeliveries = sqliteTable("push_deliveries", {
  id: text("id").primaryKey(),
  state: text("state").notNull(),
  updated: integer("updated").notNull(),
});
