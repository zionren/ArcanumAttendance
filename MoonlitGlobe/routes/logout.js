const express = require('express');
const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const { logoutRecords, users, memberAttendances, mains, handlerMainAssignments } = require('../database/schema');
const { eq, sql, and, gte, lt } = require('drizzle-orm');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const DATABASE_URL = process.env.DATABASE_URL;
const url = new URL(DATABASE_URL);
const connectionConfig = {
  host: url.hostname,
  port: parseInt(url.port, 10),
  database: url.pathname.slice(1),
  username: url.username,
  password: url.password,
  ssl: { rejectUnauthorized: false }
};
const client = postgres(connectionConfig);
const db = drizzle(client);

// Calculate score based on activities
const calculateScore = (attendeesCount, droppedLinks, recruits, nicknamesSet, gameHandled) => {
  return (
    (attendeesCount || 0) * 100 +
    (droppedLinks || 0) * 50 +
    (recruits || 0) * 500 +
    (nicknamesSet || 0) * 50 +
    (gameHandled || 0) * 1000
  );
};

// Submit logout record
router.post('/submit', requireAuth, async (req, res) => {
  try {
    const { position, dateTime, droppedLinks, recruits, nicknamesSet, gameHandled } = req.body;
    const userID = req.session.user.userID;
    const userRole = req.session.user.roleName;

    if (!position || !dateTime) {
      return res.status(400).json({ error: 'Position and date/time are required' });
    }

    // Get attendees count from member attendance records for the specified date
    const logoutDate = new Date(dateTime);
    const dayStart = new Date(logoutDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(logoutDate);
    dayEnd.setHours(23, 59, 59, 999);

    let attendeesQuery;

    if (userRole === 'handler') {
      // For handlers, only count attendees for their assigned mains
      attendeesQuery = sql`
        SELECT COUNT(DISTINCT ma.id) as total_attendees
        FROM member_attendances ma
        INNER JOIN handler_main_assignments hma ON ma.main_id = hma.main_id
        WHERE hma.user_id = ${userID}
        AND ma.date >= ${dayStart.toISOString()}
        AND ma.date <= ${dayEnd.toISOString()}
      `;
    } else {
      // For moderators, elders, and owners, count all attendees
      attendeesQuery = sql`
        SELECT COUNT(DISTINCT ma.id) as total_attendees
        FROM member_attendances ma
        WHERE ma.date >= ${dayStart.toISOString()}
        AND ma.date <= ${dayEnd.toISOString()}
      `;
    }

    const attendeesResult = await db.execute(attendeesQuery);
    const attendeesCount = parseInt(attendeesResult.rows[0]?.total_attendees || 0);

    // Calculate total score
    const totalScore = calculateScore(
      attendeesCount,
      parseInt(droppedLinks || 0),
      parseInt(recruits || 0),
      parseInt(nicknamesSet || 0),
      parseInt(gameHandled || 0)
    );

    // Create logout record
    const newRecord = await db.insert(logoutRecords).values({
      userID,
      position,
      dateTime: new Date(dateTime),
      attendeesCount,
      droppedLinks: parseInt(droppedLinks || 0),
      recruits: parseInt(recruits || 0),
      nicknamesSet: parseInt(nicknamesSet || 0),
      gameHandled: parseInt(gameHandled || 0),
      totalScore,
      updatedAt: new Date()
    }).returning();

    res.json({
      success: true,
      message: 'Logout record submitted successfully',
      record: newRecord[0]
    });

  } catch (error) {
    console.error('Submit logout record error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get logout records
router.get('/records', requireAuth, async (req, res) => {
  try {
    const { date, userID: queryUserID } = req.query;
    const currentUserID = req.session.user.userID;
    const userRole = req.session.user.roleName;

    let whereConditions = [];

    // Role-based access control
    if (['owner', 'elder'].includes(userRole)) {
      // Owners and elders can see all records or filter by specific user
      if (queryUserID) {
        whereConditions.push(`lr.user_id = ${parseInt(queryUserID)}`);
      }
    } else {
      // Other roles can only see their own records
      whereConditions.push(`lr.user_id = ${currentUserID}`);
    }

    if (date) {
      const targetDate = new Date(date);
      const nextDate = new Date(targetDate);
      nextDate.setDate(nextDate.getDate() + 1);
      whereConditions.push(`lr.date_time >= '${targetDate.toISOString()}' AND lr.date_time < '${nextDate.toISOString()}'`);
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    const records = await db.execute(sql.raw(`
      SELECT 
        lr.logout_id,
        lr.user_id,
        lr.position,
        lr.date_time,
        lr.attendees_count,
        lr.dropped_links,
        lr.recruits,
        lr.nicknames_set,
        lr.game_handled,
        lr.total_score,
        lr.created_at,
        u.username
      FROM logout_records lr
      LEFT JOIN users u ON lr.user_id = u.user_id
      ${whereClause}
      ORDER BY lr.date_time DESC
    `));

    res.json({
      success: true,
      records: records.rows
    });

  } catch (error) {
    console.error('Get logout records error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get attendance breakdown for logout form
router.get('/attendance-breakdown', requireAuth, async (req, res) => {
  try {
    const { date } = req.query;
    const userID = req.session.user.userID;
    const userRole = req.session.user.roleName;

    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    const targetDate = new Date(date);
    const dayStart = new Date(targetDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(targetDate);
    dayEnd.setHours(23, 59, 59, 999);

    let query;

    if (userRole === 'handler') {
      // For handlers, show breakdown by their assigned mains
      query = sql`
        SELECT 
          m.main_id,
          m.name as main_name,
          COUNT(ma.id) as attendance_count
        FROM mains m
        INNER JOIN handler_main_assignments hma ON m.main_id = hma.main_id
        LEFT JOIN member_attendances ma ON m.main_id = ma.main_id 
          AND ma.date >= ${dayStart.toISOString()}
          AND ma.date <= ${dayEnd.toISOString()}
        WHERE hma.user_id = ${userID}
        GROUP BY m.main_id, m.name
        ORDER BY m.name
      `;
    } else {
      // For other roles, show breakdown by all mains
      query = sql`
        SELECT 
          m.main_id,
          m.name as main_name,
          COUNT(ma.id) as attendance_count
        FROM mains m
        LEFT JOIN member_attendances ma ON m.main_id = ma.main_id 
          AND ma.date >= ${dayStart.toISOString()}
          AND ma.date <= ${dayEnd.toISOString()}
        GROUP BY m.main_id, m.name
        ORDER BY m.name
      `;
    }

    const breakdown = await db.execute(query);

    res.json({
      success: true,
      breakdown: breakdown.rows
    });

  } catch (error) {
    console.error('Get attendance breakdown error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get logout statistics
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const { startDate, endDate, userID: queryUserID } = req.query;
    const currentUserID = req.session.user.userID;
    const userRole = req.session.user.roleName;

    let whereConditions = [];

    // Role-based access control
    if (['owner', 'elder'].includes(userRole)) {
      if (queryUserID) {
        whereConditions.push(`lr.user_id = ${parseInt(queryUserID)}`);
      }
    } else {
      whereConditions.push(`lr.user_id = ${currentUserID}`);
    }

    if (startDate) {
      whereConditions.push(`lr.date_time >= '${new Date(startDate).toISOString()}'`);
    }

    if (endDate) {
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);
      whereConditions.push(`lr.date_time <= '${endDateTime.toISOString()}'`);
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    const stats = await db.execute(sql.raw(`
      SELECT 
        u.username,
        COUNT(lr.logout_id) as total_entries,
        SUM(lr.attendees_count) as total_attendees,
        SUM(lr.dropped_links) as total_dropped_links,
        SUM(lr.recruits) as total_recruits,
        SUM(lr.nicknames_set) as total_nicknames_set,
        SUM(lr.game_handled) as total_game_handled,
        SUM(lr.total_score) as cumulative_score,
        AVG(lr.total_score) as average_score
      FROM logout_records lr
      LEFT JOIN users u ON lr.user_id = u.user_id
      ${whereClause}
      GROUP BY u.user_id, u.username
      ORDER BY cumulative_score DESC
    `));

    res.json({
      success: true,
      stats: stats.rows
    });

  } catch (error) {
    console.error('Get logout stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
