const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_FILE = path.join(__dirname, 'data.json');

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Simple session storage (in production, use Redis or database)
const sessions = new Map();

// Helper function to hash passwords
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Helper function to verify password
function verifyPassword(password, hash) {
  return hashPassword(password) === hash;
}

// Middleware to authenticate requests
function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const session = sessions.get(token);
  if (!session || session.expires < Date.now()) {
    sessions.delete(token);
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
  
  req.user = session.user;
  next();
}

// Middleware to check if user is admin
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// Helper function to get user's team memberships
function getUserTeamMemberships(data, userId) {
  if (!data.teamMemberships) return [];
  return data.teamMemberships.filter(m => m.userId === userId);
}

// Helper function to get user's role in a team
function getUserTeamRole(data, userId, teamId) {
  if (!data.teamMemberships) return null;
  const membership = data.teamMemberships.find(m => m.userId === userId && m.teamId === teamId);
  return membership ? membership.role : null;
}

// Helper function to check if user is team lead
function isTeamLead(data, userId, teamId) {
  const role = getUserTeamRole(data, userId, teamId);
  return role === 'lead';
}

// Helper function to check if user can manage team
function canManageTeam(data, userId, teamId) {
  const role = getUserTeamRole(data, userId, teamId);
  return role === 'lead' || role === 'admin';
}

// Helper function to check if user can access entity
function canAccessEntity(entity, userId, userRole, data) {
  if (!entity.visibility) return true; // Default: visible to all (backward compatibility)
  
  if (entity.visibility === 'public') return true;
  if (entity.visibility === 'private' && entity.owner === userId) return true;
  if (userRole === 'admin') return true;
  
  // Team-based access
  if (entity.visibility === 'team' || entity.teamId) {
    const teamId = entity.teamId;
    
    // If no teamId, fall back to old behavior (all authenticated users)
    if (!teamId) return true;
    
    // Check if user is member of the team
    const teamRole = getUserTeamRole(data, userId, teamId);
    if (teamRole) return true; // Any team member can access
    
    // Check if entity is in a team the user belongs to
    const userTeams = getUserTeamMemberships(data, userId);
    if (userTeams.some(m => m.teamId === teamId)) return true;
  }
  
  return false;
}

// Helper function to filter entities by visibility
function filterByVisibility(entities, userId, userRole, data) {
  if (!Array.isArray(entities)) return entities;
  return entities.filter(entity => canAccessEntity(entity, userId, userRole, data));
}

// Initialize data file if it doesn't exist
async function initializeData() {
  try {
    await fs.access(DATA_FILE);
    // File exists - read it and ensure required fields exist, but NEVER overwrite existing data
    let data;
    try {
      data = await readData();
    } catch (error) {
      // If read fails, create backup and initialize fresh
      console.error('Failed to read existing data file, creating backup...');
      const backupFile = `${DATA_FILE}.backup.${Date.now()}`;
      try {
        const existingData = await fs.readFile(DATA_FILE, 'utf8');
        await fs.writeFile(backupFile, existingData);
        console.log(`Backup created: ${backupFile}`);
      } catch (backupError) {
        console.error('Could not create backup:', backupError);
      }
      // Initialize with defaults
      data = {
        outcomes: [],
        users: [],
        kpiTemplates: getDefaultKPITemplates(),
        interviewNotes: [],
        teams: [],
        teamMemberships: [],
        dataSources: [],
        dataPoints: []
      };
      await writeData(data);
      return;
    }
    
    let needsUpdate = false;
    
    // Only add default templates if the array doesn't exist at all
    // Don't replace if it's empty - user might have deleted them intentionally
    if (!data.kpiTemplates) {
      data.kpiTemplates = getDefaultKPITemplates();
      needsUpdate = true;
    }
    if (!data.interviewNotes) {
      data.interviewNotes = [];
      needsUpdate = true;
    }
    if (!data.outcomes) {
      data.outcomes = [];
      needsUpdate = true;
    }
    if (!data.users) {
      data.users = [];
      needsUpdate = true;
    }
    if (!data.teams) {
      data.teams = [];
      needsUpdate = true;
    }
    if (!data.teamMemberships) {
      data.teamMemberships = [];
      needsUpdate = true;
    }
    if (!data.dataSources) {
      data.dataSources = [];
      needsUpdate = true;
    }
    if (!data.dataPoints) {
      data.dataPoints = [];
      needsUpdate = true;
    }
    
    // Only write if we actually added missing fields
    if (needsUpdate) {
      await writeData(data);
    }
  } catch (error) {
    // File doesn't exist, create with defaults
    if (error.code === 'ENOENT') {
      const defaultData = {
        outcomes: [],
        users: [],
        kpiTemplates: getDefaultKPITemplates(),
        interviewNotes: [],
        teams: [],
        teamMemberships: [],
        dataSources: [],
        dataPoints: []
      };
      await fs.writeFile(DATA_FILE, JSON.stringify(defaultData, null, 2));
      console.log('Created new data file with defaults');
    } else {
      console.error('Error initializing data:', error);
      throw error;
    }
  }
}

// Get default KPI templates
function getDefaultKPITemplates() {
  return [
    {
      id: uuidv4(),
      name: 'Sales Calls Made',
      description: 'Number of calls made by sales representatives',
      unit: 'calls',
      category: 'Sales',
      suggestedTarget: '',
      createdAt: new Date().toISOString()
    },
    {
      id: uuidv4(),
      name: 'LinkedIn Engagement Rate',
      description: 'LinkedIn post engagement performance by marketing team',
      unit: '%',
      category: 'Marketing',
      suggestedTarget: '',
      createdAt: new Date().toISOString()
    },
    {
      id: uuidv4(),
      name: 'LinkedIn Impressions',
      description: 'Total number of LinkedIn post impressions',
      unit: 'impressions',
      category: 'Marketing',
      suggestedTarget: '',
      createdAt: new Date().toISOString()
    },
    {
      id: uuidv4(),
      name: 'LinkedIn Clicks',
      description: 'Number of clicks on LinkedIn posts',
      unit: 'clicks',
      category: 'Marketing',
      suggestedTarget: '',
      createdAt: new Date().toISOString()
    },
    {
      id: uuidv4(),
      name: 'Sales Conversion Rate',
      description: 'Percentage of leads converted to sales',
      unit: '%',
      category: 'Sales',
      suggestedTarget: '',
      createdAt: new Date().toISOString()
    },
    {
      id: uuidv4(),
      name: 'Revenue Generated',
      description: 'Total revenue from sales activities',
      unit: '$',
      category: 'Sales',
      suggestedTarget: '',
      createdAt: new Date().toISOString()
    }
  ];
}

// Read data from file
async function readData() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    if (!data || data.trim().length === 0) {
      console.warn('Data file is empty, returning defaults');
      return { outcomes: [], users: [], kpiTemplates: [], interviewNotes: [] };
    }
    const parsed = JSON.parse(data);
    // Ensure all required fields exist (but preserve existing data)
    if (!parsed.outcomes) parsed.outcomes = [];
    if (!parsed.users) parsed.users = [];
    if (!parsed.kpiTemplates) parsed.kpiTemplates = [];
    if (!parsed.interviewNotes) parsed.interviewNotes = [];
    if (!parsed.teams) parsed.teams = [];
    if (!parsed.teamMemberships) parsed.teamMemberships = [];
    if (!parsed.dataSources) parsed.dataSources = [];
    if (!parsed.dataPoints) parsed.dataPoints = [];
    return parsed;
  } catch (error) {
    console.error('Error reading data:', error);
    
    // Try to recover from backup
    if (error.code !== 'ENOENT') {
      try {
        const backupFiles = (await fs.readdir(path.dirname(DATA_FILE)))
          .filter(f => f.startsWith('data.json.backup.'))
          .sort()
          .reverse();
        
        if (backupFiles.length > 0) {
          const latestBackup = path.join(path.dirname(DATA_FILE), backupFiles[0]);
          console.log(`Attempting to recover from backup: ${latestBackup}`);
          const backupData = await fs.readFile(latestBackup, 'utf8');
          const parsed = JSON.parse(backupData);
          console.log('Successfully recovered from backup!');
          return parsed;
        }
      } catch (recoveryError) {
        console.error('Failed to recover from backup:', recoveryError);
      }
    }
    
    // Last resort: return empty structure but log critical error
    console.error('CRITICAL: Failed to read data file and no backup available.');
    console.error('Returning empty structure. Your data may be in a backup file.');
    return { outcomes: [], users: [], kpiTemplates: [], interviewNotes: [], teams: [], teamMemberships: [], dataSources: [], dataPoints: [] };
  }
}

// Write data to file with backup
async function writeData(data) {
  try {
    // Validate data structure before writing
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid data structure');
    }
    
    // Ensure required fields exist
    if (!Array.isArray(data.outcomes)) {
      console.error('CRITICAL: outcomes is not an array!', data.outcomes);
      // Try to fix it
      if (data.outcomes && typeof data.outcomes === 'object') {
        data.outcomes = Object.values(data.outcomes);
      } else {
        data.outcomes = [];
      }
    }
    
    // Create backup before writing (but don't fail if backup fails)
    try {
      const backupFile = `${DATA_FILE}.backup.${Date.now()}`;
      try {
        const existingData = await fs.readFile(DATA_FILE, 'utf8');
        await fs.writeFile(backupFile, existingData);
        // Keep only last 5 backups
        try {
          const backups = (await fs.readdir(path.dirname(DATA_FILE)))
            .filter(f => f.startsWith('data.json.backup.'))
            .sort()
            .reverse();
          for (let i = 5; i < backups.length; i++) {
            await fs.unlink(path.join(path.dirname(DATA_FILE), backups[i]));
          }
        } catch (cleanupError) {
          // Ignore cleanup errors
          console.warn('Could not clean up old backups:', cleanupError.message);
        }
      } catch (readError) {
        // File might not exist yet, that's okay
        if (readError.code !== 'ENOENT') {
          console.warn('Could not read existing file for backup:', readError.message);
        }
      }
    } catch (backupError) {
      // Backup failed, but continue with write
      console.warn('Could not create backup:', backupError.message);
    }
    
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing data:', error);
    throw error; // Re-throw to prevent silent failures
  }
}

// Helper function to recursively find entity by ID
function findEntityRecursive(items, id, getChildren) {
  for (const item of items || []) {
    if (item.id === id) return item;
    const children = getChildren(item);
    if (children && children.length > 0) {
      const found = findEntityRecursive(children, id, getChildren);
      if (found) return found;
    }
  }
  return null;
}

// Helper function to find any entity by ID in the tree
function findEntityById(data, id) {
  // Check outcomes
  for (const outcome of data.outcomes || []) {
    if (outcome.id === id) return { entity: outcome, type: 'outcome' };
    
    // Check opportunities recursively
    const findInOpportunities = (opps) => {
      for (const opp of opps || []) {
        if (opp.id === id) return { entity: opp, type: 'opportunity' };
        // Check nested opportunities
        if (opp.opportunities) {
          const nested = findInOpportunities(opp.opportunities);
          if (nested) return nested;
        }
        // Check solutions recursively
        const findInSolutions = (sols) => {
          for (const sol of sols || []) {
            if (sol.id === id) return { entity: sol, type: 'solution' };
            // Check nested solutions
            if (sol.solutions) {
              const nested = findInSolutions(sol.solutions);
              if (nested) return nested;
            }
            // Check tests
            for (const test of sol.tests || []) {
              if (test.id === id) return { entity: test, type: 'test' };
              for (const kpi of test.kpis || []) {
                if (kpi.id === id) return { entity: kpi, type: 'kpi' };
              }
            }
          }
          return null;
        };
        const solResult = findInSolutions(opp.solutions);
        if (solResult) return solResult;
      }
      return null;
    };
    const oppResult = findInOpportunities(outcome.opportunities);
    if (oppResult) return oppResult;
  }
  return null;
}

// Helper function to validate dates are coherent (child within parent)
function validateDateCoherence(childStartDate, childEndDate, parentStartDate, parentEndDate) {
  if (!childStartDate || !childEndDate) return true; // Optional dates
  
  const childStart = new Date(childStartDate);
  const childEnd = new Date(childEndDate);
  
  if (childStart > childEnd) {
    return { valid: false, error: 'Start date must be before end date' };
  }
  
  if (parentStartDate && parentEndDate) {
    const parentStart = new Date(parentStartDate);
    const parentEnd = new Date(parentEndDate);
    
    if (childStart < parentStart) {
      return { valid: false, error: 'Start date must be within parent period' };
    }
    if (childEnd > parentEnd) {
      return { valid: false, error: 'End date must be within parent period' };
    }
  }
  
  return { valid: true };
}

// Helper function to get parent dates for an entity
function getParentDates(data, entityType, entityId) {
  if (entityType === 'outcome') return null;
  
  for (const outcome of data.outcomes) {
    if (entityType === 'opportunity') {
      const opp = outcome.opportunities?.find(o => o.id === entityId);
      if (opp) {
        return {
          startDate: outcome.startDate,
          endDate: outcome.endDate
        };
      }
    }
    
    for (const opportunity of outcome.opportunities || []) {
      if (entityType === 'solution') {
        const sol = opportunity.solutions?.find(s => s.id === entityId);
        if (sol) {
          return {
            startDate: opportunity.startDate || outcome.startDate,
            endDate: opportunity.endDate || outcome.endDate
          };
        }
      }
      
      for (const solution of opportunity.solutions || []) {
        if (entityType === 'test') {
          const test = solution.tests?.find(t => t.id === entityId);
          if (test) {
            return {
              startDate: solution.startDate || opportunity.startDate || outcome.startDate,
              endDate: solution.endDate || opportunity.endDate || outcome.endDate
            };
          }
        }
      }
    }
  }
  
  return null;
}

// API Routes

// Get all outcomes (filtered by visibility and team membership)
app.get('/api/outcomes', authenticate, async (req, res) => {
  try {
    const data = await readData();
    const userId = req.user.id;
    const userRole = req.user.role;
    const teamId = req.query.teamId; // Optional: filter by team
    
    let outcomes = data.outcomes || [];
    
    // Filter by team if specified
    if (teamId) {
      outcomes = outcomes.filter(o => o.teamId === teamId);
    }
    
    // Filter outcomes by visibility
    const filteredOutcomes = filterByVisibility(outcomes, userId, userRole, data);
    
    // Recursively filter nested entities
    function filterEntity(entity) {
      if (!canAccessEntity(entity, userId, userRole, data)) return null;
      
      const filtered = { ...entity };
      
      if (filtered.opportunities) {
        filtered.opportunities = filtered.opportunities
          .map(opp => filterEntity(opp))
          .filter(opp => opp !== null);
      }
      
      return filtered;
    }
    
    const result = filteredOutcomes.map(outcome => filterEntity(outcome)).filter(o => o !== null);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create outcome
app.post('/api/outcomes', authenticate, async (req, res) => {
  try {
    const data = await readData();
    
    // Validate dates
    if (req.body.startDate && req.body.endDate) {
      const validation = validateDateCoherence(
        req.body.startDate,
        req.body.endDate,
        null,
        null
      );
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }
    }
    
    // Ensure outcomes array exists
    if (!data.outcomes) {
      data.outcomes = [];
    }
    
    // Validate team access if teamId is provided
    if (req.body.teamId) {
      const teamRole = getUserTeamRole(data, req.user.id, req.body.teamId);
      if (!teamRole && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'You must be a member of the team to create outcomes' });
      }
    }
    
    const outcome = {
      id: uuidv4(),
      title: req.body.title || 'New Outcome',
      description: req.body.description || '',
      owner: req.body.owner || req.user.id,
      visibility: req.body.visibility || 'team', // private, team, public
      teamId: req.body.teamId || null, // Associate with team
      createdBy: req.user.id,
      startDate: req.body.startDate || null,
      endDate: req.body.endDate || null,
      comments: [],
      opportunities: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    data.outcomes.push(outcome);
    
    try {
      await writeData(data);
      res.json(outcome);
    } catch (writeError) {
      console.error('Error writing outcome:', writeError);
      // Remove the outcome from memory if write failed
      data.outcomes.pop();
      res.status(500).json({ error: `Failed to save outcome: ${writeError.message}` });
    }
  } catch (error) {
    console.error('Error creating outcome:', error);
    res.status(500).json({ error: error.message || 'Failed to create outcome' });
  }
});

// Update outcome
app.put('/api/outcomes/:id', async (req, res) => {
  try {
    const data = await readData();
    const outcome = data.outcomes.find(o => o.id === req.params.id);
    if (!outcome) {
      return res.status(404).json({ error: 'Outcome not found' });
    }
    
    // Validate dates if being updated
    if (req.body.startDate !== undefined || req.body.endDate !== undefined) {
      const startDate = req.body.startDate !== undefined ? req.body.startDate : outcome.startDate;
      const endDate = req.body.endDate !== undefined ? req.body.endDate : outcome.endDate;
      
      if (startDate && endDate) {
        const validation = validateDateCoherence(startDate, endDate, null, null);
        if (!validation.valid) {
          return res.status(400).json({ error: validation.error });
        }
      }
      
      // Validate all children are within new dates
      if (outcome.opportunities) {
        for (const opp of outcome.opportunities) {
          if (opp.startDate && startDate && new Date(opp.startDate) < new Date(startDate)) {
            return res.status(400).json({ error: 'Cannot set outcome start date after opportunity start dates' });
          }
          if (opp.endDate && endDate && new Date(opp.endDate) > new Date(endDate)) {
            return res.status(400).json({ error: 'Cannot set outcome end date before opportunity end dates' });
          }
        }
      }
    }
    
    if (req.body.title !== undefined) outcome.title = req.body.title;
    if (req.body.description !== undefined) outcome.description = req.body.description;
    if (req.body.owner !== undefined) outcome.owner = req.body.owner;
    if (req.body.startDate !== undefined) outcome.startDate = req.body.startDate;
    if (req.body.endDate !== undefined) outcome.endDate = req.body.endDate;
    if (!outcome.comments) outcome.comments = [];
    outcome.updatedAt = new Date().toISOString();
    await writeData(data);
    res.json(outcome);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete outcome
app.delete('/api/outcomes/:id', async (req, res) => {
  try {
    const data = await readData();
    data.outcomes = data.outcomes.filter(o => o.id !== req.params.id);
    await writeData(data);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add opportunity to outcome
app.post('/api/outcomes/:outcomeId/opportunities', async (req, res) => {
  try {
    const data = await readData();
    const outcome = data.outcomes.find(o => o.id === req.params.outcomeId);
    if (!outcome) {
      return res.status(404).json({ error: 'Outcome not found' });
    }
    
    // Validate dates are within outcome dates
    if (req.body.startDate && req.body.endDate) {
      const validation = validateDateCoherence(
        req.body.startDate,
        req.body.endDate,
        outcome.startDate,
        outcome.endDate
      );
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }
    }
    
    const opportunity = {
      id: uuidv4(),
      title: req.body.title || 'New Opportunity',
      description: req.body.description || '',
      owner: req.body.owner || null,
      startDate: req.body.startDate || null,
      endDate: req.body.endDate || null,
      comments: [],
      opportunities: [], // Nested opportunities
      solutions: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    if (!outcome.opportunities) outcome.opportunities = [];
    outcome.opportunities.push(opportunity);
    outcome.updatedAt = new Date().toISOString();
    await writeData(data);
    res.json(opportunity);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add nested opportunity to opportunity
app.post('/api/opportunities/:opportunityId/opportunities', async (req, res) => {
  try {
    const data = await readData();
    const parentOpp = findEntityById(data, req.params.opportunityId);
    if (!parentOpp || parentOpp.type !== 'opportunity') {
      return res.status(404).json({ error: 'Opportunity not found' });
    }
    
    const opportunity = parentOpp.entity;
    let parentStart = opportunity.startDate;
    let parentEnd = opportunity.endDate;
    
    // Find parent dates by traversing up the tree
    for (const outcome of data.outcomes || []) {
      const findParent = (opps, targetId) => {
        for (const opp of opps || []) {
          if (opp.id === targetId) {
            return { start: outcome.startDate, end: outcome.endDate };
          }
          if (opp.opportunities) {
            const nested = findParent(opp.opportunities, targetId);
            if (nested) return nested;
          }
        }
        return null;
      };
      const parentDates = findParent(outcome.opportunities, req.params.opportunityId);
      if (parentDates) {
        parentStart = parentDates.start;
        parentEnd = parentDates.end;
        break;
      }
    }
    
    // Validate dates
    if (req.body.startDate && req.body.endDate) {
      const validation = validateDateCoherence(
        req.body.startDate,
        req.body.endDate,
        parentStart || opportunity.startDate,
        parentEnd || opportunity.endDate
      );
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }
    }
    
    const nestedOpportunity = {
      id: uuidv4(),
      title: req.body.title || 'New Opportunity',
      description: req.body.description || '',
      owner: req.body.owner || null,
      startDate: req.body.startDate || null,
      endDate: req.body.endDate || null,
      comments: [],
      opportunities: [],
      solutions: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    if (!opportunity.opportunities) opportunity.opportunities = [];
    opportunity.opportunities.push(nestedOpportunity);
    opportunity.updatedAt = new Date().toISOString();
    await writeData(data);
    res.json(nestedOpportunity);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper function to recursively find and update opportunity
function findAndUpdateOpportunity(opportunities, id, req, outcome) {
  for (const opportunity of opportunities || []) {
    if (opportunity.id === id) {
      return { opportunity, parent: outcome, isNested: false };
    }
    // Check nested opportunities
    if (opportunity.opportunities) {
      const nested = findAndUpdateOpportunity(opportunity.opportunities, id, req, opportunity);
      if (nested) return { ...nested, isNested: true };
    }
  }
  return null;
}

// Update opportunity
app.put('/api/opportunities/:id', async (req, res) => {
  try {
    const data = await readData();
    let found = false;
    let opportunity = null;
    let parent = null;
    
    for (const outcome of data.outcomes) {
      const result = findAndUpdateOpportunity(outcome.opportunities, req.params.id, req, outcome);
      if (result) {
        opportunity = result.opportunity;
        parent = result.parent;
        found = true;
        break;
      }
    }
    
    if (found && opportunity) {
      // Validate dates if being updated
      if (req.body.startDate !== undefined || req.body.endDate !== undefined) {
        const startDate = req.body.startDate !== undefined ? req.body.startDate : opportunity.startDate;
        const endDate = req.body.endDate !== undefined ? req.body.endDate : opportunity.endDate;
        
        // Get parent dates for validation
        let parentStart = null;
        let parentEnd = null;
        if (parent && parent.startDate) parentStart = parent.startDate;
        if (parent && parent.endDate) parentEnd = parent.endDate;
        
        if (startDate && endDate) {
          const validation = validateDateCoherence(startDate, endDate, parentStart, parentEnd);
          if (!validation.valid) {
            return res.status(400).json({ error: validation.error });
          }
        }
        
        // Validate all children are within new dates
        if (opportunity.solutions) {
          for (const sol of opportunity.solutions) {
            if (sol.startDate && startDate && new Date(sol.startDate) < new Date(startDate)) {
              return res.status(400).json({ error: 'Cannot set opportunity start date after solution start dates' });
            }
            if (sol.endDate && endDate && new Date(sol.endDate) > new Date(endDate)) {
              return res.status(400).json({ error: 'Cannot set opportunity end date before solution end dates' });
            }
          }
        }
      }
      
      if (req.body.title !== undefined) opportunity.title = req.body.title;
      if (req.body.description !== undefined) opportunity.description = req.body.description;
      if (req.body.owner !== undefined) opportunity.owner = req.body.owner;
      if (req.body.startDate !== undefined) opportunity.startDate = req.body.startDate;
      if (req.body.endDate !== undefined) opportunity.endDate = req.body.endDate;
      if (!opportunity.comments) opportunity.comments = [];
      opportunity.updatedAt = new Date().toISOString();
      if (parent) parent.updatedAt = new Date().toISOString();
    }
    if (!found) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }
    await writeData(data);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper function to recursively find and delete opportunity
function findAndDeleteOpportunity(opportunities, id, parent) {
  for (let i = 0; i < opportunities.length; i++) {
    if (opportunities[i].id === id) {
      opportunities.splice(i, 1);
      if (parent) parent.updatedAt = new Date().toISOString();
      return true;
    }
    if (opportunities[i].opportunities) {
      if (findAndDeleteOpportunity(opportunities[i].opportunities, id, opportunities[i])) {
        return true;
      }
    }
  }
  return false;
}

// Delete opportunity
app.delete('/api/opportunities/:id', async (req, res) => {
  try {
    const data = await readData();
    for (const outcome of data.outcomes) {
      if (findAndDeleteOpportunity(outcome.opportunities || [], req.params.id, outcome)) {
        outcome.updatedAt = new Date().toISOString();
        await writeData(data);
        return res.json({ success: true });
      }
    }
    res.status(404).json({ error: 'Opportunity not found' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper function to recursively find opportunity
function findOpportunityRecursive(opportunities, targetId, parentOutcome) {
  for (const opp of opportunities || []) {
    if (opp.id === targetId) {
      return { opportunity: opp, parentOutcome };
    }
    // Check nested opportunities
    if (opp.opportunities) {
      const nested = findOpportunityRecursive(opp.opportunities, targetId, parentOutcome);
      if (nested) return nested;
    }
  }
  return null;
}

// Add solution to opportunity
app.post('/api/opportunities/:opportunityId/solutions', async (req, res) => {
  try {
    const data = await readData();
    let opportunity = null;
    let outcome = null;
    
    // Search recursively for the opportunity (including nested ones)
    for (const o of data.outcomes || []) {
      const result = findOpportunityRecursive(o.opportunities, req.params.opportunityId, o);
      if (result) {
        opportunity = result.opportunity;
        outcome = result.parentOutcome;
        break;
      }
    }
    
    if (!opportunity) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }
    
    // Get parent dates (opportunity or outcome)
    const parentStart = opportunity.startDate || (outcome ? outcome.startDate : null);
    const parentEnd = opportunity.endDate || (outcome ? outcome.endDate : null);
    
    // Validate dates are within parent dates
    if (req.body.startDate && req.body.endDate) {
      const validation = validateDateCoherence(
        req.body.startDate,
        req.body.endDate,
        parentStart,
        parentEnd
      );
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }
    }
    
    const solution = {
      id: uuidv4(),
      title: req.body.title || 'New Solution',
      description: req.body.description || '',
      owner: req.body.owner || null,
      startDate: req.body.startDate || null,
      endDate: req.body.endDate || null,
      comments: [],
      solutions: [], // Nested solutions
      tests: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    if (!opportunity.solutions) opportunity.solutions = [];
    opportunity.solutions.push(solution);
    opportunity.updatedAt = new Date().toISOString();
    await writeData(data);
    res.json(solution);
  } catch (error) {
    console.error('Error creating solution:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add nested solution to solution
app.post('/api/solutions/:solutionId/solutions', async (req, res) => {
  try {
    const data = await readData();
    const result = findEntityById(data, req.params.solutionId);
    if (!result || result.type !== 'solution') {
      return res.status(404).json({ error: 'Solution not found' });
    }
    
    const solution = result.entity;
    
    // Find parent dates by traversing up
    let parentStart = solution.startDate;
    let parentEnd = solution.endDate;
    
    for (const outcome of data.outcomes || []) {
      const findSolutionDates = (opps) => {
        for (const opp of opps || []) {
          for (const sol of opp.solutions || []) {
            if (sol.id === req.params.solutionId) {
              return {
                start: sol.startDate || opp.startDate || outcome.startDate,
                end: sol.endDate || opp.endDate || outcome.endDate
              };
            }
            if (sol.solutions) {
              const nested = findNestedSolutionDates(sol.solutions, req.params.solutionId);
              if (nested) return nested;
            }
          }
          if (opp.opportunities) {
            const nested = findSolutionDates(opp.opportunities);
            if (nested) return nested;
          }
        }
        return null;
      };
      
      const findNestedSolutionDates = (sols, targetId) => {
        for (const sol of sols || []) {
          if (sol.id === targetId) {
            return { start: sol.startDate, end: sol.endDate };
          }
          if (sol.solutions) {
            const nested = findNestedSolutionDates(sol.solutions, targetId);
            if (nested) return nested;
          }
        }
        return null;
      };
      
      const dates = findSolutionDates(outcome.opportunities);
      if (dates) {
        parentStart = dates.start;
        parentEnd = dates.end;
        break;
      }
    }
    
    // Validate dates
    if (req.body.startDate && req.body.endDate) {
      const validation = validateDateCoherence(
        req.body.startDate,
        req.body.endDate,
        parentStart || solution.startDate,
        parentEnd || solution.endDate
      );
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }
    }
    
    const nestedSolution = {
      id: uuidv4(),
      title: req.body.title || 'New Solution',
      description: req.body.description || '',
      owner: req.body.owner || null,
      startDate: req.body.startDate || null,
      endDate: req.body.endDate || null,
      comments: [],
      solutions: [],
      tests: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    if (!solution.solutions) solution.solutions = [];
    solution.solutions.push(nestedSolution);
    solution.updatedAt = new Date().toISOString();
    await writeData(data);
    res.json(nestedSolution);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update solution
app.put('/api/solutions/:id', async (req, res) => {
  try {
    const data = await readData();
    let found = false;
    for (const outcome of data.outcomes) {
      for (const opportunity of outcome.opportunities) {
        const solution = opportunity.solutions.find(s => s.id === req.params.id);
        if (solution) {
          // Validate dates if being updated
          if (req.body.startDate !== undefined || req.body.endDate !== undefined) {
            const startDate = req.body.startDate !== undefined ? req.body.startDate : solution.startDate;
            const endDate = req.body.endDate !== undefined ? req.body.endDate : solution.endDate;
            
            const parentStart = opportunity.startDate || outcome.startDate;
            const parentEnd = opportunity.endDate || outcome.endDate;
            
            if (startDate && endDate) {
              const validation = validateDateCoherence(startDate, endDate, parentStart, parentEnd);
              if (!validation.valid) {
                return res.status(400).json({ error: validation.error });
              }
            }
            
            // Validate all children (tests) are within new dates
            if (solution.tests) {
              for (const test of solution.tests) {
                if (test.startDate && startDate && new Date(test.startDate) < new Date(startDate)) {
                  return res.status(400).json({ error: 'Cannot set solution start date after test start dates' });
                }
                if (test.endDate && endDate && new Date(test.endDate) > new Date(endDate)) {
                  return res.status(400).json({ error: 'Cannot set solution end date before test end dates' });
                }
              }
            }
          }
          
          if (req.body.title !== undefined) solution.title = req.body.title;
          if (req.body.description !== undefined) solution.description = req.body.description;
          if (req.body.owner !== undefined) solution.owner = req.body.owner;
          if (req.body.startDate !== undefined) solution.startDate = req.body.startDate;
          if (req.body.endDate !== undefined) solution.endDate = req.body.endDate;
          if (!solution.comments) solution.comments = [];
          solution.updatedAt = new Date().toISOString();
          opportunity.updatedAt = new Date().toISOString();
          found = true;
          break;
        }
      }
      if (found) break;
    }
    if (!found) {
      return res.status(400).json({ error: 'Solution not found' });
    }
    await writeData(data);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper function to recursively find and delete solution
function findAndDeleteSolution(opportunities, id, parent) {
  for (const opp of opportunities || []) {
    for (let i = 0; i < (opp.solutions || []).length; i++) {
      if (opp.solutions[i].id === id) {
        opp.solutions.splice(i, 1);
        if (opp) opp.updatedAt = new Date().toISOString();
        if (parent) parent.updatedAt = new Date().toISOString();
        return true;
      }
      if (opp.solutions[i].solutions) {
        if (findAndDeleteNestedSolution(opp.solutions[i].solutions, id, opp.solutions[i])) {
          return true;
        }
      }
    }
    if (opp.opportunities) {
      if (findAndDeleteSolution(opp.opportunities, id, parent)) {
        return true;
      }
    }
  }
  return false;
}

function findAndDeleteNestedSolution(solutions, id, parent) {
  for (let i = 0; i < solutions.length; i++) {
    if (solutions[i].id === id) {
      solutions.splice(i, 1);
      if (parent) parent.updatedAt = new Date().toISOString();
      return true;
    }
    if (solutions[i].solutions) {
      if (findAndDeleteNestedSolution(solutions[i].solutions, id, solutions[i])) {
        return true;
      }
    }
  }
  return false;
}

// Delete solution
app.delete('/api/solutions/:id', async (req, res) => {
  try {
    const data = await readData();
    for (const outcome of data.outcomes) {
      if (findAndDeleteSolution(outcome.opportunities || [], req.params.id, outcome)) {
        outcome.updatedAt = new Date().toISOString();
        await writeData(data);
        return res.json({ success: true });
      }
    }
    res.status(404).json({ error: 'Solution not found' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add test to solution
app.post('/api/solutions/:solutionId/tests', async (req, res) => {
  try {
    const data = await readData();
    let solution = null;
    let opportunity = null;
    let outcome = null;
    for (const o of data.outcomes) {
      for (const opp of o.opportunities) {
        solution = opp.solutions.find(s => s.id === req.params.solutionId);
        if (solution) {
          opportunity = opp;
          outcome = o;
          break;
        }
      }
      if (solution) break;
    }
    if (!solution) {
      return res.status(404).json({ error: 'Solution not found' });
    }
    
    // Get parent dates (solution, opportunity, or outcome)
    const parentStart = solution.startDate || opportunity.startDate || outcome.startDate;
    const parentEnd = solution.endDate || opportunity.endDate || outcome.endDate;
    
    // Validate dates are within parent dates
    if (req.body.startDate && req.body.endDate) {
      const validation = validateDateCoherence(
        req.body.startDate,
        req.body.endDate,
        parentStart,
        parentEnd
      );
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }
    }
    
    const test = {
      id: uuidv4(),
      title: req.body.title || 'New Test',
      description: req.body.description || '',
      owner: req.body.owner || null,
      startDate: req.body.startDate || null,
      endDate: req.body.endDate || null,
      comments: [],
      kpis: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    solution.tests.push(test);
    solution.updatedAt = new Date().toISOString();
    await writeData(data);
    res.json(test);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update test
app.put('/api/tests/:id', async (req, res) => {
  try {
    const data = await readData();
    let found = false;
    for (const outcome of data.outcomes) {
      for (const opportunity of outcome.opportunities) {
        for (const solution of opportunity.solutions) {
          const test = solution.tests.find(t => t.id === req.params.id);
          if (test) {
            // Validate dates if being updated
            if (req.body.startDate !== undefined || req.body.endDate !== undefined) {
              const startDate = req.body.startDate !== undefined ? req.body.startDate : test.startDate;
              const endDate = req.body.endDate !== undefined ? req.body.endDate : test.endDate;
              
              const parentStart = solution.startDate || opportunity.startDate || outcome.startDate;
              const parentEnd = solution.endDate || opportunity.endDate || outcome.endDate;
              
              if (startDate && endDate) {
                const validation = validateDateCoherence(startDate, endDate, parentStart, parentEnd);
                if (!validation.valid) {
                  return res.status(400).json({ error: validation.error });
                }
              }
            }
            
            if (req.body.title !== undefined) test.title = req.body.title;
            if (req.body.description !== undefined) test.description = req.body.description;
            if (req.body.owner !== undefined) test.owner = req.body.owner;
            if (req.body.startDate !== undefined) test.startDate = req.body.startDate;
            if (req.body.endDate !== undefined) test.endDate = req.body.endDate;
            if (!test.comments) test.comments = [];
            test.updatedAt = new Date().toISOString();
            solution.updatedAt = new Date().toISOString();
            found = true;
            break;
          }
        }
        if (found) break;
      }
      if (found) break;
    }
    if (!found) {
      return res.status(404).json({ error: 'Test not found' });
    }
    await writeData(data);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete test
app.delete('/api/tests/:id', async (req, res) => {
  try {
    const data = await readData();
    for (const outcome of data.outcomes) {
      for (const opportunity of outcome.opportunities) {
        for (const solution of opportunity.solutions) {
          const index = solution.tests.findIndex(t => t.id === req.params.id);
          if (index !== -1) {
            solution.tests.splice(index, 1);
            solution.updatedAt = new Date().toISOString();
            await writeData(data);
            return res.json({ success: true });
          }
        }
      }
    }
    res.status(404).json({ error: 'Test not found' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add KPI to test
app.post('/api/tests/:testId/kpis', async (req, res) => {
  try {
    const data = await readData();
    let test = null;
    for (const outcome of data.outcomes) {
      for (const opportunity of outcome.opportunities) {
        for (const solution of opportunity.solutions) {
          test = solution.tests.find(t => t.id === req.params.testId);
          if (test) break;
        }
        if (test) break;
      }
      if (test) break;
    }
    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }
    const kpi = {
      id: uuidv4(),
      name: req.body.name || 'New KPI',
      target: req.body.target || '',
      current: req.body.current || '',
      unit: req.body.unit || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    test.kpis.push(kpi);
    test.updatedAt = new Date().toISOString();
    await writeData(data);
    res.json(kpi);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update KPI
app.put('/api/kpis/:id', async (req, res) => {
  try {
    const data = await readData();
    let found = false;
    for (const outcome of data.outcomes) {
      for (const opportunity of outcome.opportunities) {
        for (const solution of opportunity.solutions) {
          for (const test of solution.tests) {
            const kpi = test.kpis.find(k => k.id === req.params.id);
            if (kpi) {
              if (req.body.name !== undefined) kpi.name = req.body.name;
              if (req.body.target !== undefined) kpi.target = req.body.target;
              if (req.body.current !== undefined) kpi.current = req.body.current;
              if (req.body.unit !== undefined) kpi.unit = req.body.unit;
              kpi.updatedAt = new Date().toISOString();
              test.updatedAt = new Date().toISOString();
              found = true;
              break;
            }
          }
          if (found) break;
        }
        if (found) break;
      }
      if (found) break;
    }
    if (!found) {
      return res.status(404).json({ error: 'KPI not found' });
    }
    await writeData(data);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete KPI
app.delete('/api/kpis/:id', async (req, res) => {
  try {
    const data = await readData();
    for (const outcome of data.outcomes) {
      for (const opportunity of outcome.opportunities) {
        for (const solution of opportunity.solutions) {
          for (const test of solution.tests) {
            const index = test.kpis.findIndex(k => k.id === req.params.id);
            if (index !== -1) {
              test.kpis.splice(index, 1);
              test.updatedAt = new Date().toISOString();
              await writeData(data);
              return res.json({ success: true });
            }
          }
        }
      }
    }
    res.status(404).json({ error: 'KPI not found' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Register new user
app.post('/api/auth/register', async (req, res) => {
  try {
    const data = await readData();
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }
    
    // Check if user already exists
    const existingUser = data.users.find(u => u.email === email);
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }
    
    const user = {
      id: uuidv4(),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash: hashPassword(password),
      role: 'user', // user, admin
      profile: {
        bio: '',
        avatar: null,
        preferences: {
          theme: 'light',
          notifications: true
        }
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    data.users.push(user);
    await writeData(data);
    
    // Create session
    const token = uuidv4();
    sessions.set(token, {
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      expires: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
    });
    
    res.json({ 
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, profile: user.profile }
    });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: error.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const data = await readData();
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    const user = data.users.find(u => u.email === email.trim().toLowerCase());
    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    if (!verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    // Create session
    const token = uuidv4();
    sessions.set(token, {
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      expires: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
    });
    
    res.json({ 
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, profile: user.profile || {} }
    });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: error.message });
  }
});

// Logout
app.post('/api/auth/logout', authenticate, (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    sessions.delete(token);
  }
  res.json({ success: true });
});

// Get current user
app.get('/api/auth/me', authenticate, async (req, res) => {
  try {
    const data = await readData();
    const user = data.users.find(u => u.id === req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ 
      id: user.id, 
      name: user.name, 
      email: user.email, 
      role: user.role,
      profile: user.profile || {}
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user profile
app.put('/api/auth/profile', authenticate, async (req, res) => {
  try {
    const data = await readData();
    const user = data.users.find(u => u.id === req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (req.body.name) user.name = req.body.name.trim();
    if (req.body.profile) {
      user.profile = { ...user.profile, ...req.body.profile };
    }
    user.updatedAt = new Date().toISOString();
    
    await writeData(data);
    
    res.json({ 
      id: user.id, 
      name: user.name, 
      email: user.email, 
      role: user.role,
      profile: user.profile
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Change password
app.post('/api/auth/change-password', authenticate, async (req, res) => {
  try {
    const data = await readData();
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }
    
    const user = data.users.find(u => u.id === req.user.id);
    if (!user || !user.passwordHash) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (!verifyPassword(currentPassword, user.passwordHash)) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    
    user.passwordHash = hashPassword(newPassword);
    user.updatedAt = new Date().toISOString();
    
    await writeData(data);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all users (for owner selection, etc.)
app.get('/api/users', authenticate, async (req, res) => {
  try {
    const data = await readData();
    // Return only public info (name, id, email) - no passwords
    const publicUsers = (data.users || []).map(u => ({
      id: u.id,
      name: u.name,
      email: u.email
    }));
    res.json(publicUsers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin endpoints for user management

// Get all users with full details (admin only)
app.get('/api/admin/users', authenticate, requireAdmin, async (req, res) => {
  try {
    const data = await readData();
    // Return all user info except password hash
    const users = (data.users || []).map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      profile: u.profile || {},
      createdAt: u.createdAt,
      updatedAt: u.updatedAt
    }));
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific user by ID (admin only)
app.get('/api/admin/users/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const data = await readData();
    const user = (data.users || []).find(u => u.id === req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      profile: user.profile || {},
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user (admin only)
app.put('/api/admin/users/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const data = await readData();
    const user = (data.users || []).find(u => u.id === req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Prevent admin from removing their own admin role
    if (req.body.role !== undefined && req.body.role !== 'admin' && user.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot remove your own admin role' });
    }
    
    if (req.body.name !== undefined) user.name = req.body.name.trim();
    if (req.body.email !== undefined) {
      const email = req.body.email.trim().toLowerCase();
      // Check if email is already taken by another user
      const existingUser = data.users.find(u => u.email === email && u.id !== user.id);
      if (existingUser) {
        return res.status(400).json({ error: 'Email already in use' });
      }
      user.email = email;
    }
    if (req.body.role !== undefined) {
      if (!['user', 'admin'].includes(req.body.role)) {
        return res.status(400).json({ error: 'Invalid role. Must be "user" or "admin"' });
      }
      user.role = req.body.role;
    }
    if (req.body.profile !== undefined) {
      user.profile = { ...user.profile, ...req.body.profile };
    }
    user.updatedAt = new Date().toISOString();
    
    await writeData(data);
    
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      profile: user.profile,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete user (admin only)
app.delete('/api/admin/users/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const data = await readData();
    
    // Prevent admin from deleting themselves
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    
    const userIndex = (data.users || []).findIndex(u => u.id === req.params.id);
    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    data.users.splice(userIndex, 1);
    await writeData(data);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reset user password (admin only)
app.post('/api/admin/users/:id/reset-password', authenticate, requireAdmin, async (req, res) => {
  try {
    const data = await readData();
    const { newPassword } = req.body;
    
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    
    const user = (data.users || []).find(u => u.id === req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    user.passwordHash = hashPassword(newPassword);
    user.updatedAt = new Date().toISOString();
    
    await writeData(data);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Team Management Endpoints

// Get all teams user is a member of
app.get('/api/teams', authenticate, async (req, res) => {
  try {
    const data = await readData();
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Get user's team memberships
    const memberships = getUserTeamMemberships(data, userId);
    const teamIds = memberships.map(m => m.teamId);
    
    // Get teams user belongs to
    let teams = (data.teams || []).filter(t => teamIds.includes(t.id));
    
    // Admins can see all teams
    if (userRole === 'admin') {
      teams = data.teams || [];
    }
    
    // Enrich with membership info
    const enrichedTeams = teams.map(team => {
      const membership = memberships.find(m => m.teamId === team.id);
      return {
        ...team,
        userRole: membership ? membership.role : null,
        memberCount: (data.teamMemberships || []).filter(m => m.teamId === team.id).length
      };
    });
    
    res.json(enrichedTeams);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get team by ID
app.get('/api/teams/:id', authenticate, async (req, res) => {
  try {
    const data = await readData();
    const userId = req.user.id;
    const userRole = req.user.role;
    
    const team = (data.teams || []).find(t => t.id === req.params.id);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    // Check access
    const teamRole = getUserTeamRole(data, userId, team.id);
    if (!teamRole && userRole !== 'admin') {
      return res.status(403).json({ error: 'You are not a member of this team' });
    }
    
    // Get team members
    const memberships = (data.teamMemberships || []).filter(m => m.teamId === team.id);
    const members = memberships.map(m => {
      const user = (data.users || []).find(u => u.id === m.userId);
      return {
        userId: m.userId,
        userName: user ? user.name : 'Unknown',
        userEmail: user ? user.email : 'Unknown',
        role: m.role,
        joinedAt: m.joinedAt
      };
    });
    
    res.json({
      ...team,
      members,
      userRole: teamRole,
      memberCount: members.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create team (becomes team lead)
app.post('/api/teams', authenticate, async (req, res) => {
  try {
    const data = await readData();
    const { name, description } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Team name is required' });
    }
    
    // Check if team name already exists
    const existingTeam = (data.teams || []).find(t => t.name.toLowerCase() === name.trim().toLowerCase());
    if (existingTeam) {
      return res.status(400).json({ error: 'Team name already exists' });
    }
    
    const team = {
      id: uuidv4(),
      name: name.trim(),
      description: description || '',
      createdBy: req.user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    if (!data.teams) data.teams = [];
    data.teams.push(team);
    
    // Add creator as team lead
    if (!data.teamMemberships) data.teamMemberships = [];
    const membership = {
      id: uuidv4(),
      teamId: team.id,
      userId: req.user.id,
      role: 'lead', // lead, member, viewer
      joinedAt: new Date().toISOString()
    };
    data.teamMemberships.push(membership);
    
    await writeData(data);
    
    res.json({
      ...team,
      userRole: 'lead',
      memberCount: 1
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update team (team lead or admin only)
app.put('/api/teams/:id', authenticate, async (req, res) => {
  try {
    const data = await readData();
    const userId = req.user.id;
    const userRole = req.user.role;
    
    const team = (data.teams || []).find(t => t.id === req.params.id);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    // Check permissions
    if (!canManageTeam(data, userId, req.params.id) && userRole !== 'admin') {
      return res.status(403).json({ error: 'Only team leads can update team information' });
    }
    
    if (req.body.name !== undefined) {
      const name = req.body.name.trim();
      if (!name) {
        return res.status(400).json({ error: 'Team name cannot be empty' });
      }
      // Check if name is taken by another team
      const existingTeam = (data.teams || []).find(t => t.name.toLowerCase() === name.toLowerCase() && t.id !== team.id);
      if (existingTeam) {
        return res.status(400).json({ error: 'Team name already exists' });
      }
      team.name = name;
    }
    if (req.body.description !== undefined) {
      team.description = req.body.description;
    }
    team.updatedAt = new Date().toISOString();
    
    await writeData(data);
    res.json(team);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete team (team lead or admin only)
app.delete('/api/teams/:id', authenticate, async (req, res) => {
  try {
    const data = await readData();
    const userId = req.user.id;
    const userRole = req.user.role;
    
    const team = (data.teams || []).find(t => t.id === req.params.id);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    // Check permissions
    if (!canManageTeam(data, userId, req.params.id) && userRole !== 'admin') {
      return res.status(403).json({ error: 'Only team leads can delete teams' });
    }
    
    // Check if team has outcomes
    const teamOutcomes = (data.outcomes || []).filter(o => o.teamId === req.params.id);
    if (teamOutcomes.length > 0) {
      return res.status(400).json({ 
        error: `Cannot delete team with ${teamOutcomes.length} outcome(s). Please delete or reassign outcomes first.` 
      });
    }
    
    // Remove team and all memberships
    data.teams = (data.teams || []).filter(t => t.id !== req.params.id);
    data.teamMemberships = (data.teamMemberships || []).filter(m => m.teamId !== req.params.id);
    
    await writeData(data);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get team members
app.get('/api/teams/:id/members', authenticate, async (req, res) => {
  try {
    const data = await readData();
    const userId = req.user.id;
    const userRole = req.user.role;
    
    const team = (data.teams || []).find(t => t.id === req.params.id);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    // Check access
    const teamRole = getUserTeamRole(data, userId, team.id);
    if (!teamRole && userRole !== 'admin') {
      return res.status(403).json({ error: 'You are not a member of this team' });
    }
    
    const memberships = (data.teamMemberships || []).filter(m => m.teamId === req.params.id);
    const members = memberships.map(m => {
      const user = (data.users || []).find(u => u.id === m.userId);
      return {
        id: m.id,
        userId: m.userId,
        userName: user ? user.name : 'Unknown',
        userEmail: user ? user.email : 'Unknown',
        role: m.role,
        joinedAt: m.joinedAt
      };
    });
    
    res.json(members);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add member to team (team lead or admin only)
app.post('/api/teams/:id/members', authenticate, async (req, res) => {
  try {
    const data = await readData();
    const userId = req.user.id;
    const userRole = req.user.role;
    const { userEmail, role = 'member' } = req.body;
    
    if (!userEmail) {
      return res.status(400).json({ error: 'User email is required' });
    }
    
    if (!['lead', 'member', 'viewer'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be "lead", "member", or "viewer"' });
    }
    
    const team = (data.teams || []).find(t => t.id === req.params.id);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    // Check permissions
    if (!canManageTeam(data, userId, req.params.id) && userRole !== 'admin') {
      return res.status(403).json({ error: 'Only team leads can add members' });
    }
    
    // Find user by email
    const userToAdd = (data.users || []).find(u => u.email.toLowerCase() === userEmail.trim().toLowerCase());
    if (!userToAdd) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if already a member
    const existingMembership = (data.teamMemberships || []).find(
      m => m.teamId === req.params.id && m.userId === userToAdd.id
    );
    if (existingMembership) {
      return res.status(400).json({ error: 'User is already a member of this team' });
    }
    
    // Prevent non-leads from adding leads
    if (role === 'lead' && !isTeamLead(data, userId, req.params.id) && userRole !== 'admin') {
      return res.status(403).json({ error: 'Only team leads can assign lead role' });
    }
    
    const membership = {
      id: uuidv4(),
      teamId: req.params.id,
      userId: userToAdd.id,
      role: role,
      joinedAt: new Date().toISOString()
    };
    
    if (!data.teamMemberships) data.teamMemberships = [];
    data.teamMemberships.push(membership);
    
    await writeData(data);
    
    res.json({
      id: membership.id,
      userId: userToAdd.id,
      userName: userToAdd.name,
      userEmail: userToAdd.email,
      role: membership.role,
      joinedAt: membership.joinedAt
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update team member role (team lead or admin only)
app.put('/api/teams/:id/members/:memberId', authenticate, async (req, res) => {
  try {
    const data = await readData();
    const userId = req.user.id;
    const userRole = req.user.role;
    const { role } = req.body;
    
    if (!role || !['lead', 'member', 'viewer'].includes(role)) {
      return res.status(400).json({ error: 'Valid role is required: "lead", "member", or "viewer"' });
    }
    
    const team = (data.teams || []).find(t => t.id === req.params.id);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    // Check permissions
    if (!canManageTeam(data, userId, req.params.id) && userRole !== 'admin') {
      return res.status(403).json({ error: 'Only team leads can update member roles' });
    }
    
    const membership = (data.teamMemberships || []).find(
      m => m.id === req.params.memberId && m.teamId === req.params.id
    );
    if (!membership) {
      return res.status(404).json({ error: 'Membership not found' });
    }
    
    // Prevent removing your own lead role
    if (membership.userId === userId && membership.role === 'lead' && role !== 'lead') {
      return res.status(400).json({ error: 'Cannot remove your own lead role' });
    }
    
    // Prevent non-leads from assigning lead role
    if (role === 'lead' && !isTeamLead(data, userId, req.params.id) && userRole !== 'admin') {
      return res.status(403).json({ error: 'Only team leads can assign lead role' });
    }
    
    membership.role = role;
    await writeData(data);
    
    const user = (data.users || []).find(u => u.id === membership.userId);
    res.json({
      id: membership.id,
      userId: membership.userId,
      userName: user ? user.name : 'Unknown',
      userEmail: user ? user.email : 'Unknown',
      role: membership.role,
      joinedAt: membership.joinedAt
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remove member from team (team lead, admin, or self)
app.delete('/api/teams/:id/members/:memberId', authenticate, async (req, res) => {
  try {
    const data = await readData();
    const userId = req.user.id;
    const userRole = req.user.role;
    
    const team = (data.teams || []).find(t => t.id === req.params.id);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    const membership = (data.teamMemberships || []).find(
      m => m.id === req.params.memberId && m.teamId === req.params.id
    );
    if (!membership) {
      return res.status(404).json({ error: 'Membership not found' });
    }
    
    // Check permissions: can manage team, is admin, or removing self
    const canRemove = canManageTeam(data, userId, req.params.id) || 
                     userRole === 'admin' || 
                     membership.userId === userId;
    
    if (!canRemove) {
      return res.status(403).json({ error: 'You do not have permission to remove this member' });
    }
    
    // Prevent removing last lead
    if (membership.role === 'lead') {
      const otherLeads = (data.teamMemberships || []).filter(
        m => m.teamId === req.params.id && m.role === 'lead' && m.id !== membership.id
      );
      if (otherLeads.length === 0) {
        return res.status(400).json({ error: 'Cannot remove the last team lead' });
      }
    }
    
    data.teamMemberships = (data.teamMemberships || []).filter(m => m.id !== req.params.memberId);
    await writeData(data);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Leave team (self only)
app.post('/api/teams/:id/leave', authenticate, async (req, res) => {
  try {
    const data = await readData();
    const userId = req.user.id;
    
    const team = (data.teams || []).find(t => t.id === req.params.id);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    const membership = (data.teamMemberships || []).find(
      m => m.teamId === req.params.id && m.userId === userId
    );
    if (!membership) {
      return res.status(404).json({ error: 'You are not a member of this team' });
    }
    
    // Prevent leaving if you're the last lead
    if (membership.role === 'lead') {
      const otherLeads = (data.teamMemberships || []).filter(
        m => m.teamId === req.params.id && m.role === 'lead' && m.id !== membership.id
      );
      if (otherLeads.length === 0) {
        return res.status(400).json({ error: 'Cannot leave team as the last lead. Assign another lead first or delete the team.' });
      }
    }
    
    data.teamMemberships = (data.teamMemberships || []).filter(m => m.id !== membership.id);
    await writeData(data);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper function to find entity by ID and type
function findEntity(data, entityId, entityType) {
  if (entityType === 'outcome') {
    return data.outcomes.find(o => o.id === entityId);
  }
  for (const outcome of data.outcomes) {
    if (entityType === 'opportunity') {
      const opp = outcome.opportunities?.find(o => o.id === entityId);
      if (opp) return opp;
    } else if (entityType === 'solution') {
      for (const opp of outcome.opportunities || []) {
        const sol = opp.solutions?.find(s => s.id === entityId);
        if (sol) return sol;
      }
    } else if (entityType === 'test') {
      for (const opp of outcome.opportunities || []) {
        for (const sol of opp.solutions || []) {
          const test = sol.tests?.find(t => t.id === entityId);
          if (test) return test;
        }
      }
    } else if (entityType === 'kpi') {
      for (const opp of outcome.opportunities || []) {
        for (const sol of opp.solutions || []) {
          for (const test of sol.tests || []) {
            const kpi = test.kpis?.find(k => k.id === entityId);
            if (kpi) return kpi;
          }
        }
      }
    }
  }
  return null;
}

// Add comment to entity
app.post('/api/comments', async (req, res) => {
  try {
    const data = await readData();
    const { entityId, entityType, text, author } = req.body;
    
    if (!entityId || !entityType || !text || !author) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const entity = findEntity(data, entityId, entityType);
    if (!entity) {
      return res.status(404).json({ error: 'Entity not found' });
    }

    if (!entity.comments) entity.comments = [];

    const comment = {
      id: uuidv4(),
      text: text,
      author: author,
      createdAt: new Date().toISOString()
    };

    entity.comments.push(comment);
    entity.updatedAt = new Date().toISOString();
    await writeData(data);
    res.json(comment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete comment
app.delete('/api/comments/:commentId', async (req, res) => {
  try {
    const data = await readData();
    const { entityId, entityType } = req.query;
    
    if (!entityId || !entityType) {
      return res.status(400).json({ error: 'Missing entityId or entityType' });
    }

    const entity = findEntity(data, entityId, entityType);
    if (!entity || !entity.comments) {
      return res.status(404).json({ error: 'Entity or comment not found' });
    }

    const index = entity.comments.findIndex(c => c.id === req.params.commentId);
    if (index === -1) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    entity.comments.splice(index, 1);
    entity.updatedAt = new Date().toISOString();
    await writeData(data);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// KPI Template endpoints

// Get all KPI templates
app.get('/api/kpi-templates', async (req, res) => {
  try {
    const data = await readData();
    const { category } = req.query;
    let templates = data.kpiTemplates || [];
    
    if (category) {
      templates = templates.filter(t => t.category === category);
    }
    
    res.json(templates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get KPI template by ID
app.get('/api/kpi-templates/:id', async (req, res) => {
  try {
    const data = await readData();
    const template = (data.kpiTemplates || []).find(t => t.id === req.params.id);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.json(template);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create KPI template
app.post('/api/kpi-templates', async (req, res) => {
  try {
    const data = await readData();
    if (!data.kpiTemplates) data.kpiTemplates = [];
    
    const template = {
      id: uuidv4(),
      name: req.body.name || 'New KPI Template',
      description: req.body.description || '',
      unit: req.body.unit || '',
      category: req.body.category || 'General',
      suggestedTarget: req.body.suggestedTarget || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    data.kpiTemplates.push(template);
    await writeData(data);
    res.json(template);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update KPI template
app.put('/api/kpi-templates/:id', async (req, res) => {
  try {
    const data = await readData();
    const template = (data.kpiTemplates || []).find(t => t.id === req.params.id);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    if (req.body.name !== undefined) template.name = req.body.name;
    if (req.body.description !== undefined) template.description = req.body.description;
    if (req.body.unit !== undefined) template.unit = req.body.unit;
    if (req.body.category !== undefined) template.category = req.body.category;
    if (req.body.suggestedTarget !== undefined) template.suggestedTarget = req.body.suggestedTarget;
    template.updatedAt = new Date().toISOString();
    
    await writeData(data);
    res.json(template);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete KPI template
app.delete('/api/kpi-templates/:id', async (req, res) => {
  try {
    const data = await readData();
    if (!data.kpiTemplates) data.kpiTemplates = [];
    
    const index = data.kpiTemplates.findIndex(t => t.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    data.kpiTemplates.splice(index, 1);
    await writeData(data);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Interview Notes endpoints

// Get all interview notes
app.get('/api/interview-notes', async (req, res) => {
  try {
    const data = await readData();
    res.json(data.interviewNotes || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get interview note by ID
app.get('/api/interview-notes/:id', async (req, res) => {
  try {
    const data = await readData();
    const note = (data.interviewNotes || []).find(n => n.id === req.params.id);
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }
    res.json(note);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create interview note
app.post('/api/interview-notes', async (req, res) => {
  try {
    const data = await readData();
    if (!data.interviewNotes) data.interviewNotes = [];
    
    const note = {
      id: uuidv4(),
      title: req.body.title || 'Untitled Interview',
      content: req.body.content || '',
      author: req.body.author || 'Unknown',
      links: [], // Array of { quoteId, quoteText, entityId, entityType }
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    data.interviewNotes.push(note);
    await writeData(data);
    res.json(note);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update interview note
app.put('/api/interview-notes/:id', async (req, res) => {
  try {
    const data = await readData();
    const note = (data.interviewNotes || []).find(n => n.id === req.params.id);
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    if (req.body.title !== undefined) note.title = req.body.title;
    if (req.body.content !== undefined) note.content = req.body.content;
    if (req.body.author !== undefined) note.author = req.body.author;
    note.updatedAt = new Date().toISOString();
    
    await writeData(data);
    res.json(note);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete interview note
app.delete('/api/interview-notes/:id', async (req, res) => {
  try {
    const data = await readData();
    if (!data.interviewNotes) data.interviewNotes = [];
    
    const index = data.interviewNotes.findIndex(n => n.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    data.interviewNotes.splice(index, 1);
    await writeData(data);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add link from note quote to entity
app.post('/api/interview-notes/:noteId/links', async (req, res) => {
  try {
    const data = await readData();
    const note = (data.interviewNotes || []).find(n => n.id === req.params.noteId);
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    if (!note.links) note.links = [];
    
    const link = {
      id: uuidv4(),
      quoteId: req.body.quoteId,
      quoteText: req.body.quoteText || '',
      entityId: req.body.entityId,
      entityType: req.body.entityType,
      createdAt: new Date().toISOString()
    };
    
    note.links.push(link);
    note.updatedAt = new Date().toISOString();
    await writeData(data);
    res.json(link);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete link from note
app.delete('/api/interview-notes/:noteId/links/:linkId', async (req, res) => {
  try {
    const data = await readData();
    const note = (data.interviewNotes || []).find(n => n.id === req.params.noteId);
    if (!note || !note.links) {
      return res.status(404).json({ error: 'Note or link not found' });
    }
    
    const index = note.links.findIndex(l => l.id === req.params.linkId);
    if (index === -1) {
      return res.status(404).json({ error: 'Link not found' });
    }
    
    note.links.splice(index, 1);
    note.updatedAt = new Date().toISOString();
    await writeData(data);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get links for a specific entity
app.get('/api/entities/:entityType/:entityId/note-links', async (req, res) => {
  try {
    const data = await readData();
    const { entityType, entityId } = req.params;
    const links = [];
    
    if (!data.interviewNotes) {
      return res.json([]);
    }
    
    for (const note of data.interviewNotes) {
      if (!note.links || !Array.isArray(note.links)) continue;
      
      for (const link of note.links) {
        if (link.entityType === entityType && link.entityId === entityId) {
          links.push({
            id: link.id,
            quoteId: link.quoteId,
            quoteText: link.quoteText || '',
            entityId: link.entityId,
            entityType: link.entityType,
            noteId: note.id,
            noteTitle: note.title || 'Untitled Note',
            createdAt: link.createdAt
          });
        }
      }
    }
    
    res.json(links);
  } catch (error) {
    console.error('Error getting entity note links:', error);
    res.status(500).json({ error: error.message });
  }
});

// Data Sources and Data Points Endpoints

// Get all data sources
app.get('/api/data-sources', authenticate, async (req, res) => {
  try {
    const data = await readData();
    res.json(data.dataSources || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get data source by ID
app.get('/api/data-sources/:id', authenticate, async (req, res) => {
  try {
    const data = await readData();
    const source = (data.dataSources || []).find(s => s.id === req.params.id);
    if (!source) {
      return res.status(404).json({ error: 'Data source not found' });
    }
    res.json(source);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create data source
app.post('/api/data-sources', authenticate, async (req, res) => {
  try {
    const data = await readData();
    const { name, type, description, config } = req.body;
    
    if (!name || !type) {
      return res.status(400).json({ error: 'Name and type are required' });
    }
    
    const validTypes = ['calling', 'microsoft-clarity', 'linkedin', 'instagram', 'custom'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: `Invalid type. Must be one of: ${validTypes.join(', ')}` });
    }
    
    const source = {
      id: uuidv4(),
      name: name.trim(),
      type: type,
      description: description || '',
      config: config || {}, // API keys, connection settings, etc.
      createdBy: req.user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true
    };
    
    if (!data.dataSources) data.dataSources = [];
    data.dataSources.push(source);
    await writeData(data);
    
    res.json(source);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update data source
app.put('/api/data-sources/:id', authenticate, async (req, res) => {
  try {
    const data = await readData();
    const source = (data.dataSources || []).find(s => s.id === req.params.id);
    if (!source) {
      return res.status(404).json({ error: 'Data source not found' });
    }
    
    // Only creator or admin can update
    if (source.createdBy !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You can only update your own data sources' });
    }
    
    if (req.body.name !== undefined) source.name = req.body.name.trim();
    if (req.body.description !== undefined) source.description = req.body.description;
    if (req.body.config !== undefined) source.config = req.body.config;
    if (req.body.isActive !== undefined) source.isActive = req.body.isActive;
    source.updatedAt = new Date().toISOString();
    
    await writeData(data);
    res.json(source);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete data source
app.delete('/api/data-sources/:id', authenticate, async (req, res) => {
  try {
    const data = await readData();
    const source = (data.dataSources || []).find(s => s.id === req.params.id);
    if (!source) {
      return res.status(404).json({ error: 'Data source not found' });
    }
    
    // Only creator or admin can delete
    if (source.createdBy !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You can only delete your own data sources' });
    }
    
    // Check if there are data points using this source
    const dataPoints = (data.dataPoints || []).filter(dp => dp.sourceId === req.params.id);
    if (dataPoints.length > 0) {
      return res.status(400).json({ 
        error: `Cannot delete data source with ${dataPoints.length} data point(s). Delete or reassign data points first.` 
      });
    }
    
    data.dataSources = (data.dataSources || []).filter(s => s.id !== req.params.id);
    await writeData(data);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all data points
app.get('/api/data-points', authenticate, async (req, res) => {
  try {
    const data = await readData();
    const { sourceId, testId } = req.query;
    
    let dataPoints = data.dataPoints || [];
    
    // Filter by source if provided
    if (sourceId) {
      dataPoints = dataPoints.filter(dp => dp.sourceId === sourceId);
    }
    
    // Filter by test if provided
    if (testId) {
      dataPoints = dataPoints.filter(dp => dp.linkedTests && dp.linkedTests.includes(testId));
    }
    
    // Enrich with source information
    const enriched = dataPoints.map(dp => {
      const source = (data.dataSources || []).find(s => s.id === dp.sourceId);
      return {
        ...dp,
        sourceName: source ? source.name : 'Unknown Source',
        sourceType: source ? source.type : 'unknown'
      };
    });
    
    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get data point by ID
app.get('/api/data-points/:id', authenticate, async (req, res) => {
  try {
    const data = await readData();
    const dataPoint = (data.dataPoints || []).find(dp => dp.id === req.params.id);
    if (!dataPoint) {
      return res.status(404).json({ error: 'Data point not found' });
    }
    
    // Enrich with source information
    const source = (data.dataSources || []).find(s => s.id === dataPoint.sourceId);
    const enriched = {
      ...dataPoint,
      sourceName: source ? source.name : 'Unknown Source',
      sourceType: source ? source.type : 'unknown'
    };
    
    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create data point
app.post('/api/data-points', authenticate, async (req, res) => {
  try {
    const data = await readData();
    const { sourceId, name, value, unit, metadata, linkedTests } = req.body;
    
    if (!sourceId || !name) {
      return res.status(400).json({ error: 'Source ID and name are required' });
    }
    
    // Verify source exists
    const source = (data.dataSources || []).find(s => s.id === sourceId);
    if (!source) {
      return res.status(404).json({ error: 'Data source not found' });
    }
    
    const dataPoint = {
      id: uuidv4(),
      sourceId: sourceId,
      name: name.trim(),
      value: value || null,
      unit: unit || '',
      metadata: metadata || {}, // Additional data specific to the source type
      linkedTests: linkedTests || [], // Array of test IDs this data point is linked to
      createdBy: req.user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    if (!data.dataPoints) data.dataPoints = [];
    data.dataPoints.push(dataPoint);
    await writeData(data);
    
    // Enrich with source info
    const enriched = {
      ...dataPoint,
      sourceName: source.name,
      sourceType: source.type
    };
    
    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update data point
app.put('/api/data-points/:id', authenticate, async (req, res) => {
  try {
    const data = await readData();
    const dataPoint = (data.dataPoints || []).find(dp => dp.id === req.params.id);
    if (!dataPoint) {
      return res.status(404).json({ error: 'Data point not found' });
    }
    
    // Only creator or admin can update
    if (dataPoint.createdBy !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You can only update your own data points' });
    }
    
    if (req.body.name !== undefined) dataPoint.name = req.body.name.trim();
    if (req.body.value !== undefined) dataPoint.value = req.body.value;
    if (req.body.unit !== undefined) dataPoint.unit = req.body.unit;
    if (req.body.metadata !== undefined) dataPoint.metadata = req.body.metadata;
    if (req.body.linkedTests !== undefined) dataPoint.linkedTests = req.body.linkedTests;
    dataPoint.updatedAt = new Date().toISOString();
    
    await writeData(data);
    
    // Enrich with source info
    const source = (data.dataSources || []).find(s => s.id === dataPoint.sourceId);
    const enriched = {
      ...dataPoint,
      sourceName: source ? source.name : 'Unknown Source',
      sourceType: source ? source.type : 'unknown'
    };
    
    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete data point
app.delete('/api/data-points/:id', authenticate, async (req, res) => {
  try {
    const data = await readData();
    const dataPoint = (data.dataPoints || []).find(dp => dp.id === req.params.id);
    if (!dataPoint) {
      return res.status(404).json({ error: 'Data point not found' });
    }
    
    // Only creator or admin can delete
    if (dataPoint.createdBy !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You can only delete your own data points' });
    }
    
    data.dataPoints = (data.dataPoints || []).filter(dp => dp.id !== req.params.id);
    await writeData(data);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Link data point to test
app.post('/api/data-points/:id/link-test', authenticate, async (req, res) => {
  try {
    const data = await readData();
    const { testId } = req.body;
    
    if (!testId) {
      return res.status(400).json({ error: 'Test ID is required' });
    }
    
    const dataPoint = (data.dataPoints || []).find(dp => dp.id === req.params.id);
    if (!dataPoint) {
      return res.status(404).json({ error: 'Data point not found' });
    }
    
    // Verify test exists
    let testExists = false;
    for (const outcome of data.outcomes || []) {
      for (const opp of outcome.opportunities || []) {
        for (const sol of opp.solutions || []) {
          if (sol.tests && sol.tests.find(t => t.id === testId)) {
            testExists = true;
            break;
          }
        }
        if (testExists) break;
      }
      if (testExists) break;
    }
    
    if (!testExists) {
      return res.status(404).json({ error: 'Test not found' });
    }
    
    // Add test to linked tests if not already linked
    if (!dataPoint.linkedTests) dataPoint.linkedTests = [];
    if (!dataPoint.linkedTests.includes(testId)) {
      dataPoint.linkedTests.push(testId);
      dataPoint.updatedAt = new Date().toISOString();
      await writeData(data);
    }
    
    res.json(dataPoint);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Unlink data point from test
app.post('/api/data-points/:id/unlink-test', authenticate, async (req, res) => {
  try {
    const data = await readData();
    const { testId } = req.body;
    
    if (!testId) {
      return res.status(400).json({ error: 'Test ID is required' });
    }
    
    const dataPoint = (data.dataPoints || []).find(dp => dp.id === req.params.id);
    if (!dataPoint) {
      return res.status(404).json({ error: 'Data point not found' });
    }
    
    if (dataPoint.linkedTests) {
      dataPoint.linkedTests = dataPoint.linkedTests.filter(id => id !== testId);
      dataPoint.updatedAt = new Date().toISOString();
      await writeData(data);
    }
    
    res.json(dataPoint);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get data points for a specific test
app.get('/api/tests/:testId/data-points', authenticate, async (req, res) => {
  try {
    const data = await readData();
    const dataPoints = (data.dataPoints || []).filter(dp => 
      dp.linkedTests && dp.linkedTests.includes(req.params.testId)
    );
    
    // Enrich with source information
    const enriched = dataPoints.map(dp => {
      const source = (data.dataSources || []).find(s => s.id === dp.sourceId);
      return {
        ...dp,
        sourceName: source ? source.name : 'Unknown Source',
        sourceType: source ? source.type : 'unknown'
      };
    });
    
    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Integration API Endpoints

const IntegrationManager = require('./integrations/manager');

// Get available integration types
app.get('/api/integrations/types', authenticate, (req, res) => {
  try {
    const types = IntegrationManager.getIntegrationTypes();
    res.json(types);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test data source connection
app.post('/api/data-sources/:id/test', authenticate, async (req, res) => {
  try {
    const data = await readData();
    const source = (data.dataSources || []).find(s => s.id === req.params.id);
    if (!source) {
      return res.status(404).json({ error: 'Data source not found' });
    }

    // Only creator or admin can test
    if (source.createdBy !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You can only test your own data sources' });
    }

    // Skip test for custom type (no API to test)
    if (source.type === 'custom') {
      return res.json({ success: true, message: 'Custom source - no connection test available' });
    }

    try {
      const integration = IntegrationManager.createIntegration(source.type, source.config);
      const result = await integration.testConnection();
      res.json(result);
    } catch (error) {
      res.status(400).json({ 
        success: false, 
        message: error.message || 'Connection test failed' 
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Fetch data from data source
app.post('/api/data-sources/:id/fetch', authenticate, async (req, res) => {
  try {
    const data = await readData();
    const source = (data.dataSources || []).find(s => s.id === req.params.id);
    if (!source) {
      return res.status(404).json({ error: 'Data source not found' });
    }

    // Only creator or admin can fetch
    if (source.createdBy !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You can only fetch from your own data sources' });
    }

    if (!source.isActive) {
      return res.status(400).json({ error: 'Data source is not active' });
    }

    // Skip fetch for custom type (manual entry only)
    if (source.type === 'custom') {
      return res.status(400).json({ error: 'Custom sources require manual data entry' });
    }

    const { startDate, endDate, autoCreate = false, linkToTests = [] } = req.body;

    try {
      const integration = IntegrationManager.createIntegration(source.type, source.config);
      const fetchedDataPoints = await integration.fetchData({ startDate, endDate });

      const createdPoints = [];

      if (autoCreate && fetchedDataPoints.length > 0) {
        // Auto-create data points from fetched data
        for (const pointData of fetchedDataPoints) {
          const dataPoint = {
            id: uuidv4(),
            sourceId: source.id,
            name: pointData.name,
            value: pointData.value,
            unit: pointData.unit || '',
            metadata: {
              ...pointData.metadata,
              fetchedAt: new Date().toISOString(),
              autoCreated: true
            },
            linkedTests: linkToTests || [],
            createdBy: req.user.id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          if (!data.dataPoints) data.dataPoints = [];
          data.dataPoints.push(dataPoint);
          createdPoints.push(dataPoint);
        }

        await writeData(data);
      }

      res.json({
        success: true,
        fetchedCount: fetchedDataPoints.length,
        createdCount: createdPoints.length,
        dataPoints: fetchedDataPoints,
        createdPoints: createdPoints.map(dp => {
          const enriched = {
            ...dp,
            sourceName: source.name,
            sourceType: source.type
          };
          return enriched;
        })
      });
    } catch (error) {
      res.status(400).json({ 
        success: false, 
        error: error.message || 'Failed to fetch data from source' 
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get available metrics for a data source type
app.get('/api/integrations/:type/metrics', authenticate, (req, res) => {
  try {
    const { type } = req.params;
    const integration = IntegrationManager.createIntegration(type, {});
    const metrics = integration.getAvailableMetrics();
    res.json(metrics);
  } catch (error) {
    res.status(400).json({ error: error.message || 'Invalid integration type' });
  }
});

// Validate data source configuration
app.post('/api/integrations/:type/validate', authenticate, (req, res) => {
  try {
    const { type } = req.params;
    const { config } = req.body;
    
    if (!config) {
      return res.status(400).json({ error: 'Configuration is required' });
    }

    const integration = IntegrationManager.createIntegration(type, config);
    const validation = integration.validateConfig();
    res.json(validation);
  } catch (error) {
    res.status(400).json({ error: error.message || 'Invalid integration type or configuration' });
  }
});

// Health check (for load balancers and deployment)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server when run directly (not when required by tests)
async function startServer() {
  await initializeData();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = { app };

