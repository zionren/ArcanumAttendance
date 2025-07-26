# Arcanum Academy Attendance System

## Overview

This is a role-based attendance and tracking system for the Arcanum Academy gaming community (previously RP Hood). The system allows council members to log in and manage attendance records, while regular members can submit attendance through a public interface. It features logout tracking for staff performance monitoring and role-based access control. The system includes a winter snow globe themed design.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

The application follows a traditional server-side rendered architecture with:

- **Backend**: Node.js with Express.js framework
- **Database**: PostgreSQL with Drizzle ORM
- **Frontend**: Vanilla HTML/CSS/JavaScript with winter snow globe background theme
- **Authentication**: Session-based with express-session
- **Security**: Helmet, CORS, rate limiting, and bcrypt for password hashing

The system is designed as a monolithic application where the Express server serves both API endpoints and static files.

## Key Components

### Database Schema
- **Role-based user system** with roles (owner, moderator, elder, handler)
- **Main events management** for different activities
- **Attendance tracking** for both staff-recorded and member-submitted attendance
- **Handler assignments** linking handlers to specific main events
- **Logout records** for tracking staff performance metrics

### Authentication & Authorization
- Session-based authentication using express-session
- Role-based access control middleware
- Password hashing with bcryptjs
- IP tracking for member attendance submissions

### API Structure
- `/api/auth/*` - Authentication endpoints
- `/api/users/*` - User management (admin only)
- `/api/attendance/*` - Attendance management
- `/api/logout/*` - Logout record management

### Frontend Components
- **Public landing page** with navigation to login and member attendance
- **Login system** for council members
- **Dashboard** with role-based tabs and features
- **Member attendance form** with time restrictions (5 AM - 10 PM GMT+8)

## Data Flow

1. **Member Attendance Flow**:
   - Members access public attendance form
   - System validates time window (6 AM - 9 PM GMT+8)
   - IP address tracking prevents duplicate submissions
   - One submission per main per day per IP

2. **Council Management Flow**:
   - Council members log in with credentials  
   - Role-based dashboard access
   - Handlers can only manage their assigned mains
   - Owners/elders have full system access

3. **Logout Tracking Flow**:
   - Staff submit logout records with performance metrics
   - System calculates scores based on activities
   - Attendance counts are automatically calculated from member submissions

## Recent Changes

### January 26, 2025
- Updated system title from "RP Hood" to "Arcanum Academy"
- Changed attendance submission hours from 6AM-9PM to 5AM-10PM GMT+8
- Added winter snow globe background theme using provided image
- Fixed database connection issues with URL parsing for Supabase integration
- Successfully deployed database initialization with default admin account

## External Dependencies

### Core Dependencies
- **express** (v5.1.0) - Web framework
- **drizzle-orm** (v0.44.3) - Database ORM
- **postgres** (v3.4.7) - PostgreSQL client
- **bcryptjs** (v3.0.2) - Password hashing
- **express-session** (v1.18.2) - Session management

### Security Dependencies
- **helmet** (v8.1.0) - Security headers
- **cors** (v2.8.5) - Cross-origin resource sharing
- **express-rate-limit** (v8.0.1) - Rate limiting
- **dotenv** (v17.2.1) - Environment variable management

### Database Configuration
- Uses Supabase PostgreSQL as the primary database
- Connection string stored in environment variables
- Drizzle ORM handles schema definition and migrations

## Deployment Strategy

### Environment Setup
- Requires `DATABASE_URL` environment variable for PostgreSQL connection
- `SESSION_SECRET` for session security
- `PORT` configuration (defaults to 8000)

### Security Considerations
- Rate limiting (100 requests per 15 minutes per IP)
- Content Security Policy configured
- Session cookies with httpOnly flag
- CORS enabled with credentials support

### Time Zone Handling
- Member attendance restricted to 5 AM - 10 PM GMT+8
- All timestamps stored in UTC in database
- Frontend displays times in GMT+8 for consistency

### File Structure
- Static files served from `/public` directory
- API routes organized in `/routes` directory
- Database schema and initialization in `/database` directory
- Authentication middleware in `/middleware` directory

The system is designed for deployment on platforms like Replit, with environment variables for configuration and a single entry point (`server.js`).