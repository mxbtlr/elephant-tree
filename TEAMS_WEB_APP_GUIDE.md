# How to Create and Manage Teams in the Web App

## Accessing Teams

1. **Log in** to the OST web application
2. Click on the **"Teams"** tab in the main navigation (between "OST Tree" and "Interview Notes")
3. You'll see the Teams management interface

## Creating a Team

1. Click the **"Create Team"** button in the top right
2. Fill in the form:
   - **Team Name** (required): Enter a descriptive name for your team
   - **Description** (optional): Add a description of what the team is for
3. Click **"Create Team"**
4. You automatically become the **Team Lead** when you create a team

## Viewing Your Teams

- All teams you're a member of appear in the left sidebar
- Click on any team card to view its details
- The selected team is highlighted in blue
- Each team card shows:
  - Team name
  - Your role (lead, member, or viewer)
  - Number of members
  - Team description

## Managing Team Members

### Adding Members (Team Leads Only)

1. Select a team you lead
2. Click **"Add Member"** in the Members section
3. Enter the **user's email address**
4. Select their **role**:
   - **Member**: Can create and edit outcomes
   - **Viewer**: Read-only access
   - **Lead**: Full control (only existing leads can assign this)
5. Click **"Add Member"**

### Changing Member Roles (Team Leads Only)

1. Select a team you lead
2. In the Members list, find the member
3. Use the **role dropdown** next to their name
4. Select the new role (Viewer, Member, or Lead)
5. The change is saved automatically

### Removing Members

- **Team Leads**: Can remove any member
- **Members**: Can remove themselves
- Click the **trash icon** next to a member's name
- Confirm the removal

### Leaving a Team

1. Select a team you want to leave
2. Click the **"Leave"** button in the top right
3. Confirm you want to leave
4. **Note**: You cannot leave if you're the last lead (assign another lead first)

## Team Roles Explained

### Lead
- Create, update, and delete the team
- Add and remove members
- Change member roles
- Create and edit all team outcomes
- Cannot remove your own lead role

### Member
- View and edit all team outcomes
- Create new outcomes in the team
- Cannot manage team settings or members

### Viewer
- View team outcomes only
- Cannot create or edit outcomes
- Cannot manage team settings

## Creating Team Outcomes

After creating a team, you can create outcomes that belong to that team:

1. Go to the **"OST Tree"** tab
2. Click **"Add Outcome"**
3. In the outcome form, you'll need to specify the `teamId` (this may require UI updates)
4. Currently, you can create team outcomes via the API or by editing the outcome after creation

**Note**: The UI for selecting a team when creating outcomes may need to be added to the EntityForm component.

## Deleting a Team

1. Select a team you lead
2. Click the **"Delete"** button in the top right
3. Confirm the deletion
4. **Important**: Teams with outcomes cannot be deleted. You must delete or reassign all outcomes first.

## Visual Indicators

- **Crown icon (👑)**: Team Lead
- **User icon (👤)**: Team Member  
- **Eye icon (👁)**: Viewer
- **"You" badge**: Your own account in the members list
- **Blue highlight**: Currently selected team

## Tips

1. **Multiple Leads**: Assign multiple leads to ensure team continuity
2. **Clear Names**: Use descriptive team names (e.g., "Product Team", "Engineering Q1")
3. **Role Assignment**: 
   - Use "Member" for active contributors
   - Use "Viewer" for stakeholders who only need to see progress
4. **Team Organization**: Create separate teams for different projects or departments

## Troubleshooting

**Can't see the Teams tab?**
- Make sure you're logged in
- Refresh the page
- Check browser console for errors

**Can't create a team?**
- Team name must be unique
- Check for error messages in red at the top

**Can't add a member?**
- Only team leads can add members
- User email must exist in the system
- User must not already be a member

**Can't delete a team?**
- You must be a team lead
- Team must have no outcomes
- Delete or reassign outcomes first

## Next Steps

To create outcomes for a team, you may need to:
1. Note the team ID from the Teams page
2. Use the API directly, or
3. Wait for UI updates to add team selection to the outcome creation form

The team management system is fully functional - you can create teams, manage members, and control access. Team-based outcomes can be created via the API or by updating outcomes after creation.





