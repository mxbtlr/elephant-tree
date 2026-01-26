# User Management Guide

## Accessing the Backend

### Starting the Server

1. **Navigate to the server directory:**
   ```bash
   cd server
   ```

2. **Start the server:**
   ```bash
   npm start
   # or for development with auto-reload:
   npm run dev
   ```

3. **The server will run on:** `http://localhost:3001` (or the port specified in `PORT` environment variable)

### API Base URL
- Default: `http://localhost:3001/api`
- All endpoints are prefixed with `/api`

## Viewing Registered Users

### Method 1: Direct File Access
Users are stored in `server/data.json` under the `users` array. You can view/edit this file directly:

```bash
cat server/data.json | jq '.users'
# or open in your editor
code server/data.json
```

### Method 2: Via API (Requires Authentication)

1. **Login first to get a token:**
   ```bash
   curl -X POST http://localhost:3001/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@example.com","password":"yourpassword"}'
   ```

2. **Get all users (returns public info only):**
   ```bash
   curl -X GET http://localhost:3001/api/users \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

### Method 3: Using the Frontend
- The frontend Login component allows registration
- Once logged in, you can access user info via the API

## Current User Management Capabilities

### Available Endpoints:
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login and get token
- `GET /api/auth/me` - Get current user info
- `PUT /api/auth/profile` - Update your own profile
- `POST /api/auth/change-password` - Change your own password
- `GET /api/users` - Get all users (public info only)

### Limitations:
- No admin endpoints to delete users
- No admin endpoints to update other users
- No admin endpoints to change user roles
- Users must edit `data.json` directly for advanced management

## User Data Structure

Each user in `data.json` has this structure:
```json
{
  "id": "uuid",
  "name": "User Name",
  "email": "user@example.com",
  "passwordHash": "sha256-hashed-password",
  "role": "user",  // or "admin"
  "profile": {
    "bio": "",
    "avatar": null,
    "preferences": {
      "theme": "light",
      "notifications": true
    }
  },
  "createdAt": "ISO timestamp",
  "updatedAt": "ISO timestamp"
}
```

## Manual User Management

### Creating an Admin User

1. Register a user normally through the frontend
2. Edit `server/data.json` and change the user's `role` from `"user"` to `"admin"`

### Deleting a User

1. Open `server/data.json`
2. Find the user in the `users` array
3. Remove the user object
4. Save the file (server will auto-reload if using `npm run dev`)

### Changing a User's Password

1. The password is hashed using SHA-256
2. You can generate a new hash using Node.js:
   ```javascript
   const crypto = require('crypto');
   const hash = crypto.createHash('sha256').update('newpassword').digest('hex');
   console.log(hash);
   ```
3. Update the `passwordHash` field in `data.json`

## Admin Endpoints

The following admin endpoints are available for managing users. **All require admin role.**

### Authentication
All admin endpoints require:
1. Valid authentication token (Bearer token in Authorization header)
2. User must have `role: "admin"` in their user record

### Available Admin Endpoints:

#### Get All Users (Admin)
```bash
GET /api/admin/users
```
Returns all users with full details (except password hash).

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "User Name",
    "email": "user@example.com",
    "role": "user",
    "profile": {...},
    "createdAt": "timestamp",
    "updatedAt": "timestamp"
  }
]
```

#### Get User by ID (Admin)
```bash
GET /api/admin/users/:id
```
Returns a specific user's details.

#### Update User (Admin)
```bash
PUT /api/admin/users/:id
Body: {
  "name": "New Name",      // optional
  "email": "new@email.com", // optional
  "role": "admin",          // optional: "user" or "admin"
  "profile": {...}          // optional
}
```
Updates user information. Cannot remove your own admin role.

#### Delete User (Admin)
```bash
DELETE /api/admin/users/:id
```
Deletes a user. Cannot delete your own account.

#### Reset User Password (Admin)
```bash
POST /api/admin/users/:id/reset-password
Body: {
  "newPassword": "newpassword123"
}
```
Resets a user's password. Password must be at least 6 characters.

### Example Usage with cURL

1. **Login as admin:**
   ```bash
   curl -X POST http://localhost:3001/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@example.com","password":"yourpassword"}'
   ```
   Save the token from the response.

2. **Get all users:**
   ```bash
   curl -X GET http://localhost:3001/api/admin/users \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

3. **Update a user's role:**
   ```bash
   curl -X PUT http://localhost:3001/api/admin/users/USER_ID \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"role":"admin"}'
   ```

4. **Reset a user's password:**
   ```bash
   curl -X POST http://localhost:3001/api/admin/users/USER_ID/reset-password \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"newPassword":"newpassword123"}'
   ```

5. **Delete a user:**
   ```bash
   curl -X DELETE http://localhost:3001/api/admin/users/USER_ID \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

## Making a User an Admin

1. **Register/login as the user** (or find their user ID in `data.json`)
2. **Update their role using the admin endpoint:**
   ```bash
   curl -X PUT http://localhost:3001/api/admin/users/USER_ID \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"role":"admin"}'
   ```
3. **Or manually edit `data.json`** and change `"role": "user"` to `"role": "admin"`

## Client-Side API Methods

The client-side API service (`client/src/services/api.js`) includes these admin methods:
- `api.getAdminUsers()` - Get all users
- `api.getAdminUser(id)` - Get specific user
- `api.updateAdminUser(id, data)` - Update user
- `api.deleteAdminUser(id)` - Delete user
- `api.resetUserPassword(id, newPassword)` - Reset password

You can use these in React components to build an admin interface.

