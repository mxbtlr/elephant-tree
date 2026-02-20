# Team Management Guide

## Overview

TreeFlow supports team-based collaboration. Teams allow multiple users to work together on shared decision trees with role-based permissions.

## Team Roles

Teams have three role levels:

1. **Lead** - Full control:
   - Create, update, and delete team
   - Add/remove members
   - Change member roles
   - Create and manage all team outcomes
   - Cannot remove their own lead role (must assign another lead first)

2. **Member** - Full editing access:
   - View and edit all team outcomes
   - Create new outcomes in the team
   - Cannot manage team settings or members

3. **Viewer** - Read-only access:
   - View team outcomes
   - Cannot create or edit outcomes

## Team Structure

### Data Model

**Team:**
```json
{
  "id": "uuid",
  "name": "Team Name",
  "description": "Team description",
  "createdBy": "user-id",
  "createdAt": "ISO timestamp",
  "updatedAt": "ISO timestamp"
}
```

**Team Membership:**
```json
{
  "id": "uuid",
  "teamId": "team-uuid",
  "userId": "user-uuid",
  "role": "lead" | "member" | "viewer",
  "joinedAt": "ISO timestamp"
}
```

**Outcome (with team):**
```json
{
  "id": "uuid",
  "title": "Outcome Title",
  "teamId": "team-uuid",
  "visibility": "team",
  ...
}
```

## API Endpoints

### Get All Teams
```bash
GET /api/teams
```
Returns all teams the authenticated user is a member of. Admins see all teams.

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Engineering Team",
    "description": "...",
    "userRole": "lead",
    "memberCount": 5,
    "createdAt": "...",
    "updatedAt": "..."
  }
]
```

### Get Team Details
```bash
GET /api/teams/:id
```
Returns team details including all members.

**Response:**
```json
{
  "id": "uuid",
  "name": "Engineering Team",
  "description": "...",
  "members": [
    {
      "userId": "uuid",
      "userName": "John Doe",
      "userEmail": "john@example.com",
      "role": "lead",
      "joinedAt": "..."
    }
  ],
  "userRole": "lead",
  "memberCount": 5
}
```

### Create Team
```bash
POST /api/teams
Body: {
  "name": "Team Name",
  "description": "Optional description"
}
```
Creates a new team. The creator automatically becomes the team lead.

**Response:** Team object with `userRole: "lead"`

### Update Team
```bash
PUT /api/teams/:id
Body: {
  "name": "New Name",        // optional
  "description": "New desc"  // optional
}
```
Only team leads can update team information.

### Delete Team
```bash
DELETE /api/teams/:id
```
Only team leads can delete teams. Team must have no outcomes (delete or reassign first).

### Get Team Members
```bash
GET /api/teams/:id/members
```
Returns list of all team members with their roles.

### Add Team Member
```bash
POST /api/teams/:id/members
Body: {
  "userEmail": "user@example.com",
  "role": "member"  // "lead", "member", or "viewer"
}
```
Only team leads can add members. Only leads can assign "lead" role.

### Update Member Role
```bash
PUT /api/teams/:id/members/:memberId
Body: {
  "role": "member"  // "lead", "member", or "viewer"
}
```
Only team leads can update member roles. Cannot remove your own lead role.

### Remove Team Member
```bash
DELETE /api/teams/:id/members/:memberId
```
Team leads can remove any member. Users can remove themselves. Cannot remove last lead.

### Leave Team
```bash
POST /api/teams/:id/leave
```
Allows a user to leave a team. Cannot leave if you're the last lead.

## Creating Team Outcomes

When creating an outcome, include the `teamId`:

```bash
POST /api/outcomes
Body: {
  "title": "Team Outcome",
  "teamId": "team-uuid",
  "visibility": "team"
}
```

**Access Control:**
- Only team members can create outcomes in a team
- Team members can view/edit all team outcomes (based on their role)
- Viewers can only view, not edit

## Filtering Outcomes by Team

```bash
GET /api/outcomes?teamId=team-uuid
```
Returns only outcomes belonging to the specified team.

## Client-Side API Methods

All team operations are available in `client/src/services/api.js`:

```javascript
// Get teams
const teams = await api.getTeams();

// Get team details
const team = await api.getTeam(teamId);

// Create team
const newTeam = await api.createTeam({ name: "My Team", description: "..." });

// Update team
await api.updateTeam(teamId, { name: "New Name" });

// Delete team
await api.deleteTeam(teamId);

// Get members
const members = await api.getTeamMembers(teamId);

// Add member
await api.addTeamMember(teamId, "user@example.com", "member");

// Update member role
await api.updateTeamMember(teamId, memberId, "lead");

// Remove member
await api.removeTeamMember(teamId, memberId);

// Leave team
await api.leaveTeam(teamId);

// Get team outcomes
const outcomes = await api.getOutcomesByTeam(teamId);
```

## Example Usage

### Creating a Team and Adding Members

```javascript
// 1. Create team (you become lead)
const team = await api.createTeam({
  name: "Product Team",
  description: "Product development team"
});

// 2. Add members
await api.addTeamMember(team.id, "john@example.com", "member");
await api.addTeamMember(team.id, "jane@example.com", "member");
await api.addTeamMember(team.id, "bob@example.com", "viewer");

// 3. Create team outcome
const outcome = await api.createOutcome({
  title: "Increase User Engagement",
  teamId: team.id,
  visibility: "team"
});
```

### Managing Team Members

```javascript
// Get team members
const members = await api.getTeamMembers(teamId);

// Promote member to lead
const member = members.find(m => m.role === "member");
await api.updateTeamMember(teamId, member.id, "lead");

// Change member to viewer
await api.updateTeamMember(teamId, member.id, "viewer");

// Remove member
await api.removeTeamMember(teamId, member.id);
```

## Migration Notes

- Existing outcomes without `teamId` remain accessible to all authenticated users (backward compatible)
- New outcomes should specify `teamId` for team-based access
- Teams are optional - users can still create personal outcomes without teams

## Best Practices

1. **Team Naming**: Use clear, descriptive team names
2. **Role Assignment**: 
   - Assign multiple leads for redundancy
   - Use "member" for active contributors
   - Use "viewer" for stakeholders who only need read access
3. **Outcome Organization**: Create team-specific outcomes to keep work organized
4. **Team Cleanup**: Delete unused teams or reassign outcomes before deletion

## Permissions Summary

| Action | Lead | Member | Viewer | Admin |
|--------|------|--------|--------|-------|
| Create team | ✅ | ❌ | ❌ | ✅ |
| Update team | ✅ | ❌ | ❌ | ✅ |
| Delete team | ✅ | ❌ | ❌ | ✅ |
| Add members | ✅ | ❌ | ❌ | ✅ |
| Remove members | ✅ | ❌ | ❌ | ✅ |
| Change roles | ✅ | ❌ | ❌ | ✅ |
| Create outcomes | ✅ | ✅ | ❌ | ✅ |
| Edit outcomes | ✅ | ✅ | ❌ | ✅ |
| View outcomes | ✅ | ✅ | ✅ | ✅ |
| Leave team | ✅ | ✅ | ✅ | ✅ |





