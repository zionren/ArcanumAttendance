const express = require('express');
const bcrypt = require('bcryptjs');
const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const { users, roles } = require('../database/schema');
const { eq } = require('drizzle-orm');
const { getUserContext } = require('../middleware/auth');

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

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Find user with role information
    const userResult = await db
      .select({
        userID: users.userID,
        username: users.username,
        passwordHash: users.passwordHash,
        email: users.email,
        roleID: users.roleID,
        roleName: roles.roleName
      })
      .from(users)
      .leftJoin(roles, eq(users.roleID, roles.id))
      .where(eq(users.username, username))
      .limit(1);

    if (userResult.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = userResult[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Get full user context including assigned mains
    const userContext = await getUserContext(user.userID);

    // Store user in session
    req.session.user = {
      userID: user.userID,
      username: user.username,
      roleName: user.roleName,
      assignedMains: userContext?.assigned_mains || []
    };

    res.json({
      success: true,
      user: {
        userID: user.userID,
        username: user.username,
        roleName: user.roleName,
        assignedMains: userContext?.assigned_mains || []
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout endpoint
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'Could not log out' });
    }
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

// Check authentication status
router.get('/status', (req, res) => {
  if (req.session.user) {
    res.json({
      authenticated: true,
      user: req.session.user
    });
  } else {
    res.json({
      authenticated: false
    });
  }
});

module.exports = router;
