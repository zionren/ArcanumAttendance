const express = require('express');
const bcrypt = require('bcryptjs');
const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const { users, roles, handlerMainAssignments, mains } = require('../database/schema');
const { eq, sql } = require('drizzle-orm');
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

// Create user account (Owner and Elder only)
router.post('/create', requireRole(['owner', 'elder']), async (req, res) => {
  try {
    const { username, password, email, roleName } = req.body;

    if (!username || !password || !roleName) {
      return res.status(400).json({ error: 'Username, password, and role are required' });
    }

    // Validate role
    const roleResult = await db.select().from(roles).where(eq(roles.roleName, roleName)).limit(1);
    if (roleResult.length === 0) {
      return res.status(400).json({ error: 'Invalid role specified' });
    }

    // Check if username already exists
    const existingUser = await db.select().from(users).where(eq(users.username, username)).limit(1);
    if (existingUser.length > 0) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = await db.insert(users).values({
      username,
      passwordHash: hashedPassword,
      email: email || null,
      roleID: roleResult[0].id
    }).returning();

    res.json({
      success: true,
      message: 'User created successfully',
      user: {
        userID: newUser[0].userID,
        username: newUser[0].username,
        email: newUser[0].email,
        roleName
      }
    });

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Promote/demote user (Owner and Elder only)
router.post('/promote', requireRole(['owner', 'elder']), async (req, res) => {
  try {
    const { userID, newRoleName } = req.body;

    if (!userID || !newRoleName) {
      return res.status(400).json({ error: 'User ID and new role are required' });
    }

    // Validate new role
    const roleResult = await db.select().from(roles).where(eq(roles.roleName, newRoleName)).limit(1);
    if (roleResult.length === 0) {
      return res.status(400).json({ error: 'Invalid role specified' });
    }

    // Update user role
    const updatedUser = await db
      .update(users)
      .set({ roleID: roleResult[0].id })
      .where(eq(users.userID, userID))
      .returning();

    if (updatedUser.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      message: 'User role updated successfully'
    });

  } catch (error) {
    console.error('Promote user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all mains (public endpoint)
router.get('/mains', async (req, res) => {
  try {
    const allMains = await db.select().from(mains).orderBy(mains.name);
    
    res.json({
      success: true,
      mains: allMains
    });
  } catch (error) {
    console.error('Get mains error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Assign handler to main
router.post('/assign-main', requireRole(['owner', 'elder']), async (req, res) => {
  try {
    const { userID, mainID } = req.body;

    if (!userID || !mainID) {
      return res.status(400).json({ error: 'User ID and Main ID are required' });
    }

    // Verify user exists and is a handler
    const userResult = await db
      .select({
        userID: users.userID,
        roleName: roles.roleName
      })
      .from(users)
      .leftJoin(roles, eq(users.roleID, roles.id))
      .where(eq(users.userID, userID))
      .limit(1);

    if (userResult.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (userResult[0].roleName !== 'handler') {
      return res.status(400).json({ error: 'Only handlers can be assigned to mains' });
    }

    // Verify main exists
    const mainResult = await db.select().from(mains).where(eq(mains.mainID, mainID)).limit(1);
    if (mainResult.length === 0) {
      return res.status(404).json({ error: 'Main not found' });
    }

    // Create assignment
    await db.insert(handlerMainAssignments).values({
      userID,
      mainID
    }).onConflictDoNothing();

    res.json({
      success: true,
      message: 'Handler assigned to main successfully'
    });

  } catch (error) {
    console.error('Assign main error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all users (Owner and Elder only)
router.get('/list', requireRole(['owner', 'elder']), async (req, res) => {
  try {
    const usersList = await db.execute(sql`
      SELECT 
        u.user_id,
        u.username,
        u.email,
        r.role_name,
        COALESCE(
          json_agg(
            json_build_object('mainID', m.main_id, 'name', m.name)
          ) FILTER (WHERE m.main_id IS NOT NULL),
          '[]'::json
        ) as assigned_mains
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN handler_main_assignments hma ON u.user_id = hma.user_id
      LEFT JOIN mains m ON hma.main_id = m.main_id
      GROUP BY u.user_id, u.username, u.email, r.role_name
      ORDER BY u.username
    `);

    res.json({
      success: true,
      users: usersList.rows
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all mains
router.get('/mains', requireAuth, async (req, res) => {
  try {
    const mainsList = await db.select().from(mains).orderBy(mains.name);

    res.json({
      success: true,
      mains: mainsList
    });

  } catch (error) {
    console.error('Get mains error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
