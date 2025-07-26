const express = require('express');
const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const { attendanceRecords, memberAttendances, mains, users, handlerMainAssignments } = require('../database/schema');
const { eq, sql, and, gte, lt } = require('drizzle-orm');
const { requireAuth, requireRole } = require('../middleware/auth');

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

// Helper function to get client IP
const getClientIP = (req) => {
  return req.headers['x-forwarded-for'] || 
         req.headers['x-real-ip'] || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
         '127.0.0.1';
};

// Helper function to check if current time is within allowed hours (5AM - 10PM GMT+8)
const isWithinAllowedHours = () => {
  const now = new Date();
  // Convert to GMT+8
  const gmt8Time = new Date(now.getTime() + (8 * 60 * 60 * 1000));
  const hour = gmt8Time.getUTCHours();
  return hour >= 5 && hour < 22; // 5AM to 10PM
};

// Public member attendance submission
router.post('/member', async (req, res) => {
  try {
    const { mainID, memberCode } = req.body;
    const clientIP = getClientIP(req);

    if (!mainID) {
      return res.status(400).json({ error: 'Main ID is required' });
    }

    // Check if within allowed hours
    if (!isWithinAllowedHours()) {
      return res.status(403).json({ 
        error: 'Attendance submissions are only allowed between 5:00 AM and 10:00 PM GMT+8' 
      });
    }

    // Verify main exists
    const mainResult = await db.select().from(mains).where(eq(mains.mainID, mainID)).limit(1);
    if (mainResult.length === 0) {
      return res.status(404).json({ error: 'Main not found' });
    }

    // Check if IP has already submitted today for this main
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingAttendance = await db
      .select()
      .from(memberAttendances)
      .where(
        and(
          eq(memberAttendances.mainID, mainID),
          eq(memberAttendances.ipAddress, clientIP),
          gte(memberAttendances.date, today),
          lt(memberAttendances.date, tomorrow)
        )
      )
      .limit(1);

    if (existingAttendance.length > 0) {
      return res.status(400).json({ 
        error: 'You have already submitted attendance for this main today' 
      });
    }

    // Create attendance record
    const newAttendance = await db.insert(memberAttendances).values({
      mainID: parseInt(mainID),
      ipAddress: clientIP,
      memberCode: memberCode || null
    }).returning();

    res.json({
      success: true,
      message: 'Attendance recorded successfully',
      attendanceID: newAttendance[0].id
    });

  } catch (error) {
    console.error('Member attendance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get attendance records (role-based access)
router.get('/records', requireAuth, async (req, res) => {
  try {
    const { mainID, date } = req.query;
    const userRole = req.session.user.roleName;
    const userID = req.session.user.userID;

    let whereConditions = [];
    let joins = `
      FROM attendance_records ar
      LEFT JOIN users u ON ar.created_by_user_id = u.user_id
      LEFT JOIN mains m ON ar.main_id = m.main_id
    `;

    // Role-based filtering
    if (userRole === 'handler') {
      // Handlers can only see records for their assigned mains
      joins += ` 
        INNER JOIN handler_main_assignments hma ON ar.main_id = hma.main_id AND hma.user_id = ${userID}
      `;
    }

    if (mainID) {
      whereConditions.push(`ar.main_id = ${parseInt(mainID)}`);
    }

    if (date) {
      const targetDate = new Date(date);
      const nextDate = new Date(targetDate);
      nextDate.setDate(nextDate.getDate() + 1);
      whereConditions.push(`ar.date_and_time >= '${targetDate.toISOString()}' AND ar.date_and_time < '${nextDate.toISOString()}'`);
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    const records = await db.execute(sql.raw(`
      SELECT 
        ar.attendance_id,
        ar.date_and_time,
        ar.status,
        u.username as created_by,
        m.name as main_name,
        m.main_id
      ${joins}
      ${whereClause}
      ORDER BY ar.date_and_time DESC
    `));

    res.json({
      success: true,
      records: records.rows
    });

  } catch (error) {
    console.error('Get attendance records error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create attendance record (Moderator, Elder, Owner, Handler for assigned mains)
router.post('/records', requireAuth, async (req, res) => {
  try {
    const { mainID, status = 'present' } = req.body;
    const userRole = req.session.user.roleName;
    const userID = req.session.user.userID;

    if (!mainID) {
      return res.status(400).json({ error: 'Main ID is required' });
    }

    // Verify main exists
    const mainResult = await db.select().from(mains).where(eq(mains.mainID, mainID)).limit(1);
    if (mainResult.length === 0) {
      return res.status(404).json({ error: 'Main not found' });
    }

    // Check permissions
    if (userRole === 'handler') {
      // Verify handler is assigned to this main
      const assignment = await db
        .select()
        .from(handlerMainAssignments)
        .where(
          and(
            eq(handlerMainAssignments.userID, userID),
            eq(handlerMainAssignments.mainID, mainID)
          )
        )
        .limit(1);

      if (assignment.length === 0) {
        return res.status(403).json({ error: 'You are not assigned to this main' });
      }
    } else if (!['moderator', 'elder', 'owner'].includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Create attendance record
    const newRecord = await db.insert(attendanceRecords).values({
      createdByUserID: userID,
      mainID: parseInt(mainID),
      status
    }).returning();

    res.json({
      success: true,
      message: 'Attendance record created successfully',
      record: newRecord[0]
    });

  } catch (error) {
    console.error('Create attendance record error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete attendance record (Moderator, Elder, Owner, Handler for assigned mains)
router.delete('/records/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.session.user.roleName;
    const userID = req.session.user.userID;

    // Get the record to check permissions
    const recordResult = await db
      .select()
      .from(attendanceRecords)
      .where(eq(attendanceRecords.attendanceID, parseInt(id)))
      .limit(1);

    if (recordResult.length === 0) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }

    const record = recordResult[0];

    // Check permissions
    if (userRole === 'handler') {
      // Verify handler is assigned to the main of this record
      const assignment = await db
        .select()
        .from(handlerMainAssignments)
        .where(
          and(
            eq(handlerMainAssignments.userID, userID),
            eq(handlerMainAssignments.mainID, record.mainID)
          )
        )
        .limit(1);

      if (assignment.length === 0) {
        return res.status(403).json({ error: 'You are not assigned to this main' });
      }
    } else if (!['moderator', 'elder', 'owner'].includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Delete the record
    await db.delete(attendanceRecords).where(eq(attendanceRecords.attendanceID, parseInt(id)));

    res.json({
      success: true,
      message: 'Attendance record deleted successfully'
    });

  } catch (error) {
    console.error('Delete attendance record error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get member attendance statistics
router.get('/member-stats', requireAuth, async (req, res) => {
  try {
    const { date } = req.query;
    const userRole = req.session.user.roleName;
    const userID = req.session.user.userID;

    let whereConditions = [];
    let joins = `
      FROM member_attendances ma
      LEFT JOIN mains m ON ma.main_id = m.main_id
    `;

    // Role-based filtering for handlers
    if (userRole === 'handler') {
      joins += ` 
        INNER JOIN handler_main_assignments hma ON ma.main_id = hma.main_id AND hma.user_id = ${userID}
      `;
    }

    if (date) {
      const targetDate = new Date(date);
      const nextDate = new Date(targetDate);
      nextDate.setDate(nextDate.getDate() + 1);
      whereConditions.push(`ma.date >= '${targetDate.toISOString()}' AND ma.date < '${nextDate.toISOString()}'`);
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    const stats = await db.execute(sql.raw(`
      SELECT 
        m.main_id,
        m.name as main_name,
        COUNT(ma.id) as attendance_count
      ${joins}
      ${whereClause}
      GROUP BY m.main_id, m.name
      ORDER BY m.name
    `));

    res.json({
      success: true,
      stats: stats.rows
    });

  } catch (error) {
    console.error('Get member stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
