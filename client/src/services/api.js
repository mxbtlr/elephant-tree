import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3010/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ost_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors (unauthorized)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Only log out if it's actually a session/auth error, not a permission error
      const errorMessage = error.response?.data?.error || '';
      // Check if it's a session expiration or invalid token error
      if (errorMessage.includes('session') || 
          errorMessage.includes('Authentication required') || 
          errorMessage.includes('Invalid or expired')) {
        localStorage.removeItem('ost_token');
        localStorage.removeItem('ost_user');
        window.location.href = '/';
      }
      // For other 401 errors (like permission issues), just reject the promise
      // so the component can handle it
    }
    return Promise.reject(error);
  }
);

export default {
  getOutcomes: () => api.get('/outcomes').then(res => res.data),
  
  createOutcome: (data) => api.post('/outcomes', data).then(res => res.data),
  
  updateOutcome: (id, data) => api.put(`/outcomes/${id}`, data).then(res => res.data),
  
  deleteOutcome: (id) => api.delete(`/outcomes/${id}`).then(res => res.data),
  
  createOpportunity: (outcomeId, data) => 
    api.post(`/outcomes/${outcomeId}/opportunities`, data).then(res => res.data),
  
  updateOpportunity: (id, data) => 
    api.put(`/opportunities/${id}`, data).then(res => res.data),
  
  deleteOpportunity: (id) => 
    api.delete(`/opportunities/${id}`).then(res => res.data),
  
  // Nested Opportunities
  createNestedOpportunity: (opportunityId, data) => 
    api.post(`/opportunities/${opportunityId}/opportunities`, data).then(res => res.data),
  
  createSolution: (opportunityId, data) => 
    api.post(`/opportunities/${opportunityId}/solutions`, data).then(res => res.data),
  
  // Nested Solutions
  createNestedSolution: (solutionId, data) => 
    api.post(`/solutions/${solutionId}/solutions`, data).then(res => res.data),
  
  updateSolution: (id, data) => 
    api.put(`/solutions/${id}`, data).then(res => res.data),
  
  deleteSolution: (id) => 
    api.delete(`/solutions/${id}`).then(res => res.data),
  
  createTest: (solutionId, data) => 
    api.post(`/solutions/${solutionId}/tests`, data).then(res => res.data),
  
  updateTest: (id, data) => 
    api.put(`/tests/${id}`, data).then(res => res.data),
  
  deleteTest: (id) => 
    api.delete(`/tests/${id}`).then(res => res.data),
  
  createKPI: (testId, data) => 
    api.post(`/tests/${testId}/kpis`, data).then(res => res.data),
  
  updateKPI: (id, data) => 
    api.put(`/kpis/${id}`, data).then(res => res.data),
  
  deleteKPI: (id) => 
    api.delete(`/kpis/${id}`).then(res => res.data),
  
  // Authentication
  register: (data) => 
    api.post('/auth/register', data).then(res => res.data),
  
  login: (data) => 
    api.post('/auth/login', data).then(res => res.data),
  
  logout: () => 
    api.post('/auth/logout').then(res => res.data),
  
  getCurrentUser: () => 
    api.get('/auth/me').then(res => res.data),
  
  updateProfile: (data) => 
    api.put('/auth/profile', data).then(res => res.data),
  
  changePassword: (data) => 
    api.post('/auth/change-password', data).then(res => res.data),
  
  getUsers: () => 
    api.get('/users').then(res => res.data),
  
  // Admin endpoints for user management
  getAdminUsers: () => 
    api.get('/admin/users').then(res => res.data),
  
  getAdminUser: (id) => 
    api.get(`/admin/users/${id}`).then(res => res.data),
  
  updateAdminUser: (id, data) => 
    api.put(`/admin/users/${id}`, data).then(res => res.data),
  
  deleteAdminUser: (id) => 
    api.delete(`/admin/users/${id}`).then(res => res.data),
  
  resetUserPassword: (id, newPassword) => 
    api.post(`/admin/users/${id}/reset-password`, { newPassword }).then(res => res.data),
  
  addComment: (entityId, entityType, data) => 
    api.post('/comments', { entityId, entityType, ...data }).then(res => res.data),
  
  deleteComment: (commentId, entityId, entityType) => 
    api.delete(`/comments/${commentId}`, { params: { entityId, entityType } }).then(res => res.data),
  
  // KPI Templates
  getKPITemplates: (category) => 
    api.get('/kpi-templates', { params: category ? { category } : {} }).then(res => res.data),
  
  getKPITemplate: (id) => 
    api.get(`/kpi-templates/${id}`).then(res => res.data),
  
  createKPITemplate: (data) => 
    api.post('/kpi-templates', data).then(res => res.data),
  
  updateKPITemplate: (id, data) => 
    api.put(`/kpi-templates/${id}`, data).then(res => res.data),
  
  deleteKPITemplate: (id) => 
    api.delete(`/kpi-templates/${id}`).then(res => res.data),
  
  // Interview Notes
  getInterviewNotes: () => 
    api.get('/interview-notes').then(res => res.data),
  
  getInterviewNote: (id) => 
    api.get(`/interview-notes/${id}`).then(res => res.data),
  
  createInterviewNote: (data) => 
    api.post('/interview-notes', data).then(res => res.data),
  
  updateInterviewNote: (id, data) => 
    api.put(`/interview-notes/${id}`, data).then(res => res.data),
  
  deleteInterviewNote: (id) => 
    api.delete(`/interview-notes/${id}`).then(res => res.data),
  
  addNoteLink: (noteId, data) => 
    api.post(`/interview-notes/${noteId}/links`, data).then(res => res.data),
  
  deleteNoteLink: (noteId, linkId) => 
    api.delete(`/interview-notes/${noteId}/links/${linkId}`).then(res => res.data),
  
  getEntityNoteLinks: (entityType, entityId) => 
    api.get(`/entities/${entityType}/${entityId}/note-links`).then(res => res.data),
  
  // Team Management
  getTeams: () => 
    api.get('/teams').then(res => res.data),
  
  getTeam: (id) => 
    api.get(`/teams/${id}`).then(res => res.data),
  
  createTeam: (data) => 
    api.post('/teams', data).then(res => res.data),
  
  updateTeam: (id, data) => 
    api.put(`/teams/${id}`, data).then(res => res.data),
  
  deleteTeam: (id) => 
    api.delete(`/teams/${id}`).then(res => res.data),
  
  getTeamMembers: (teamId) => 
    api.get(`/teams/${teamId}/members`).then(res => res.data),
  
  addTeamMember: (teamId, userEmail, role) => 
    api.post(`/teams/${teamId}/members`, { userEmail, role }).then(res => res.data),
  
  updateTeamMember: (teamId, memberId, role) => 
    api.put(`/teams/${teamId}/members/${memberId}`, { role }).then(res => res.data),
  
  removeTeamMember: (teamId, memberId) => 
    api.delete(`/teams/${teamId}/members/${memberId}`).then(res => res.data),
  
  leaveTeam: (teamId) => 
    api.post(`/teams/${teamId}/leave`).then(res => res.data),
  
  // Get outcomes filtered by team
  getOutcomesByTeam: (teamId) => 
    api.get('/outcomes', { params: { teamId } }).then(res => res.data),
  
  // Data Sources
  getDataSources: () => 
    api.get('/data-sources').then(res => res.data),
  
  getDataSource: (id) => 
    api.get(`/data-sources/${id}`).then(res => res.data),
  
  createDataSource: (data) => 
    api.post('/data-sources', data).then(res => res.data),
  
  updateDataSource: (id, data) => 
    api.put(`/data-sources/${id}`, data).then(res => res.data),
  
  deleteDataSource: (id) => 
    api.delete(`/data-sources/${id}`).then(res => res.data),
  
  // Data Points
  getDataPoints: (sourceId, testId) => 
    api.get('/data-points', { params: { sourceId, testId } }).then(res => res.data),
  
  getDataPoint: (id) => 
    api.get(`/data-points/${id}`).then(res => res.data),
  
  createDataPoint: (data) => 
    api.post('/data-points', data).then(res => res.data),
  
  updateDataPoint: (id, data) => 
    api.put(`/data-points/${id}`, data).then(res => res.data),
  
  deleteDataPoint: (id) => 
    api.delete(`/data-points/${id}`).then(res => res.data),
  
  linkDataPointToTest: (dataPointId, testId) => 
    api.post(`/data-points/${dataPointId}/link-test`, { testId }).then(res => res.data),
  
  unlinkDataPointFromTest: (dataPointId, testId) => 
    api.post(`/data-points/${dataPointId}/unlink-test`, { testId }).then(res => res.data),
  
  getTestDataPoints: (testId) => 
    api.get(`/tests/${testId}/data-points`).then(res => res.data),
  
  // Integration APIs
  getIntegrationTypes: () => 
    api.get('/integrations/types').then(res => res.data),
  
  testDataSource: (sourceId) => 
    api.post(`/data-sources/${sourceId}/test`).then(res => res.data),
  
  fetchDataSource: (sourceId, options) => 
    api.post(`/data-sources/${sourceId}/fetch`, options).then(res => res.data),
  
  getIntegrationMetrics: (type) => 
    api.get(`/integrations/${type}/metrics`).then(res => res.data),
  
  validateIntegrationConfig: (type, config) => 
    api.post(`/integrations/${type}/validate`, { config }).then(res => res.data),
};

