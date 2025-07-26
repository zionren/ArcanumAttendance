const { pgTable, serial, varchar, integer, timestamp, text, boolean, foreignKey, unique } = require('drizzle-orm/pg-core');

// Role table
const roles = pgTable('roles', {
  id: serial('id').primaryKey(),
  roleName: varchar('role_name', { length: 50 }).notNull().unique()
});

// User table
const users = pgTable('users', {
  userID: serial('user_id').primaryKey(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  email: varchar('email', { length: 100 }),
  roleID: integer('role_id').references(() => roles.id).notNull()
});

// Main table
const mains = pgTable('mains', {
  mainID: serial('main_id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description')
});

// HandlerMainAssignment table
const handlerMainAssignments = pgTable('handler_main_assignments', {
  id: serial('id').primaryKey(),
  userID: integer('user_id').references(() => users.userID).notNull(),
  mainID: integer('main_id').references(() => mains.mainID).notNull()
}, (table) => ({
  uniqueAssignment: unique().on(table.userID, table.mainID)
}));

// AttendanceRecord table
const attendanceRecords = pgTable('attendance_records', {
  attendanceID: serial('attendance_id').primaryKey(),
  createdByUserID: integer('created_by_user_id').references(() => users.userID).notNull(),
  mainID: integer('main_id').references(() => mains.mainID).notNull(),
  dateAndTime: timestamp('date_and_time').defaultNow().notNull(),
  status: varchar('status', { length: 20 }).default('present').notNull()
});

// MemberAttendance table
const memberAttendances = pgTable('member_attendances', {
  id: serial('id').primaryKey(),
  mainID: integer('main_id').references(() => mains.mainID).notNull(),
  date: timestamp('date').defaultNow().notNull(),
  ipAddress: varchar('ip_address', { length: 45 }).notNull(),
  memberCode: varchar('member_code', { length: 50 })
});

// LogoutRecord table
const logoutRecords = pgTable('logout_records', {
  logoutID: serial('logout_id').primaryKey(),
  userID: integer('user_id').references(() => users.userID).notNull(),
  position: varchar('position', { length: 100 }).notNull(),
  dateTime: timestamp('date_time').notNull(),
  attendeesCount: integer('attendees_count').default(0),
  droppedLinks: integer('dropped_links').default(0),
  recruits: integer('recruits').default(0),
  nicknamesSet: integer('nicknames_set').default(0),
  gameHandled: integer('game_handled').default(0),
  totalScore: integer('total_score').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

module.exports = {
  roles,
  users,
  mains,
  handlerMainAssignments,
  attendanceRecords,
  memberAttendances,
  logoutRecords
};
