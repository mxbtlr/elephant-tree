# Team-Based OST Grouping Feature

## Overview

TreeFlow supports team-based grouping and sharing of decision trees. Outcomes can be assigned to teams, and users can filter and view outcomes by team.

## Key Features

### 1. Team-Based Grouping
- Outcomes are automatically grouped by team in the tree view
- Each team section shows a header with the team name and outcome count
- Personal outcomes (without a team) are shown in a separate "Personal Outcomes" section

### 2. Team Selection When Creating Outcomes
- When creating a new outcome, users can select which team to share it with
- Users can choose from all teams they're members of
- Option to create personal outcomes (no team assignment)
- Team role is shown next to team name (Lead, Member, Viewer)

### 3. Team Filtering
- Team filter dropdown in the tree view controls
- Filter options:
  - **All Teams**: Shows all outcomes grouped by team
  - **Specific Team**: Shows only outcomes for that team
  - **No Team**: Shows only personal outcomes

### 4. Edit Team Assignment
- When editing an outcome, users can change the team assignment
- Move outcomes between teams or make them personal
- Team selection is available in the edit form

## User Interface

### Tree View Controls
- **Team Filter Dropdown**: Select which team's outcomes to view
- Shows team icon and name
- Displays count of personal outcomes if any exist

### Team Sections
- Each team has a distinct header with:
  - Team icon
  - Team name
  - Outcome count
- Headers use a gradient background for visual distinction

### Outcome Creation Form
- **Share with Team** dropdown:
  - "No team (Personal)" option
  - List of all teams user belongs to
  - Shows user's role in each team
  - Helpful description of what team assignment means

## How to Use

### Creating a Team Outcome

1. Click **"Add Outcome"** button
2. Fill in the outcome details
3. In the **"Share with Team"** dropdown:
   - Select a team to share with, or
   - Leave as "No team (Personal)" for personal outcomes
4. Click **"Save"**

### Filtering by Team

1. Use the **team filter dropdown** in the tree controls
2. Select:
   - **All Teams** to see everything grouped by team
   - A specific team name to see only that team's outcomes
   - **No Team** to see only personal outcomes

### Changing Team Assignment

1. Click the **edit icon** on any outcome
2. In the edit form, use the **"Share with Team"** dropdown
3. Select a different team or "No team (Personal)"
4. Click **"Save"**

## Access Control

- **Team Members**: Can view and edit outcomes in their teams (based on role)
- **Team Leads**: Full control over team outcomes
- **Team Viewers**: Can only view team outcomes
- **Personal Outcomes**: Only visible to the creator (unless visibility is set to public)

## Visual Indicators

- **Team Headers**: Gradient background with team icon
- **Team Filter**: Shows current filter selection
- **Team Dropdown**: Shows user's role in each team
- **Outcome Count**: Displayed next to each team header

## Technical Details

### Data Structure
- Outcomes now have an optional `teamId` field
- Outcomes without `teamId` are considered "personal"
- Team assignment is independent of visibility settings

### API Integration
- Creating outcomes with `teamId` associates them with the team
- Updating outcomes can change `teamId`
- Filtering by team uses the `teamId` query parameter

### Component Updates
- **App.js**: Loads teams and passes to TreeView
- **TreeView.js**: Groups outcomes by team and provides filtering
- **EntityForm.js**: Adds team selection dropdown
- **AddOutcomeButton.js**: Passes teams to EntityForm
- **OutcomeNode.js**: Supports team selection when editing

## Best Practices

1. **Organize by Project**: Create separate teams for different projects
2. **Use Team Names**: Use descriptive team names (e.g., "Q1 Product Team")
3. **Personal vs Team**: Use personal outcomes for individual work, team outcomes for collaboration
4. **Team Roles**: Assign appropriate roles - use "Viewer" for stakeholders who only need to see progress

## Migration Notes

- Existing outcomes without `teamId` remain as personal outcomes
- Users can manually assign existing outcomes to teams by editing them
- Team assignment is optional - personal outcomes continue to work as before

## Future Enhancements

Potential improvements:
- Share outcomes with multiple teams
- Team-level permissions and settings
- Team activity feed
- Export team outcomes
- Team templates





