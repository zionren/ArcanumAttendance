const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const { users, roles } = require('../database/schema');
const { sql, eq } = require('drizzle-orm');

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

// Middleware to check if user is authenticated
const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

// Middleware to check specific roles
const requireRole = (allowedRoles) => {
  return async (req, res, next) => {
    if (!req.session.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      const userWithRole = await db
        .select({
          userID: users.userID,
          username: users.username,
          roleName: roles.roleName
        })
        .from(users)
        .leftJoin(roles, eq(users.roleID, roles.id))
        .where(eq(users.userID, req.session.user.userID))
        .limit(1);

      if (userWithRole.length === 0) {
        return res.status(403).json({ error: 'User not found' });
      }

      const userRole = userWithRole[0].roleName;
      
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      req.user = userWithRole[0];
      next();
    } catch (error) {
      console.error('Error checking user role:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};

// Get user's role and assigned mains
const getUserContext = async (userID) => {
  try {
    const userContext = await db.execute(sql`
      SELECT 
        u.user_id,
        u.username,
        r.role_name,
        COALESCE(
          json_agg(
            json_build_object('mainID', hma.main_id, 'name', m.name)
          ) FILTER (WHERE hma.main_id IS NOT NULL),
          '[]'::json
        ) as assigned_mains
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN handler_main_assignments hma ON u.user_id = hma.user_id
      LEFT JOIN mains m ON hma.main_id = m.main_id
      WHERE u.user_id = ${userID}
      GROUP BY u.user_id, u.username, r.role_name
    `);

    return userContext.rows[0] || null;
  } catch (error) {
    console.error('Error getting user context:', error);
    return null;
  }
};

module.exports = {
  requireAuth,
  requireRole,
  getUserContext
};
