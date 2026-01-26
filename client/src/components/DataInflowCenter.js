import React, { useState, useEffect } from 'react';
import { FaDatabase, FaPlus, FaLink, FaUnlink, FaTrash, FaEdit, FaTimes, FaCheck, FaChartLine, FaSync, FaPlug } from 'react-icons/fa';
import api from '../services/supabaseApi';
import './DataInflowCenter.css';

function DataInflowCenter({ currentUser, outcomes }) {
  const [dataSources, setDataSources] = useState([]);
  const [dataPoints, setDataPoints] = useState([]);
  const [integrationTypes, setIntegrationTypes] = useState([]);
  const [selectedSource, setSelectedSource] = useState(null);
  const [showSourceForm, setShowSourceForm] = useState(false);
  const [showDataPointForm, setShowDataPointForm] = useState(false);
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [showFetchDialog, setShowFetchDialog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [sourceFormData, setSourceFormData] = useState({
    name: '',
    type: 'custom',
    description: '',
    config: {}
  });
  const [configFormData, setConfigFormData] = useState({});
  const [dataPointFormData, setDataPointFormData] = useState({
    sourceId: '',
    name: '',
    value: '',
    unit: '',
    metadata: {}
  });
  const [linkTestDialog, setLinkTestDialog] = useState(null);
  const [fetchedData, setFetchedData] = useState(null);

  useEffect(() => {
    loadData();
    loadIntegrationTypes();
  }, []);

  useEffect(() => {
    // Reset config form when type changes
    if (sourceFormData.type) {
      const typeInfo = integrationTypes.find(t => t.type === sourceFormData.type);
      if (typeInfo) {
        const newConfig = {};
        typeInfo.requiredFields.forEach(field => {
          newConfig[field] = '';
        });
        typeInfo.optionalFields.forEach(field => {
          newConfig[field] = '';
        });
        setConfigFormData(newConfig);
      }
    }
  }, [sourceFormData.type, integrationTypes]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [sources, points] = await Promise.all([
        api.getDataSources(),
        api.getDataPoints()
      ]);
      setDataSources(sources || []);
      setDataPoints(points || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadIntegrationTypes = async () => {
    try {
      const types = await api.getIntegrationTypes();
      setIntegrationTypes(types || []);
    } catch (err) {
      console.error('Error loading integration types:', err);
    }
  };

  const handleCreateSource = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validate config if not custom
    if (sourceFormData.type !== 'custom') {
      try {
        const validation = await api.validateIntegrationConfig(sourceFormData.type, configFormData);
        if (!validation.valid) {
          setError(validation.error || 'Invalid configuration');
          return;
        }
      } catch (err) {
        setError(err.response?.data?.error || 'Configuration validation failed');
        return;
      }
    }

    try {
      // For calling type, include platform in config
      let finalConfig = configFormData;
      if (sourceFormData.type === 'calling' && configFormData.platform) {
        finalConfig = { ...configFormData, platform: configFormData.platform };
      }
      
      const sourceData = {
        ...sourceFormData,
        config: sourceFormData.type !== 'custom' ? finalConfig : {}
      };
      await api.createDataSource(sourceData);
      setSuccess('Data source created successfully!');
      setSourceFormData({ name: '', type: 'custom', description: '', config: {} });
      setConfigFormData({});
      setShowSourceForm(false);
      setShowConfigForm(false);
      
      // Reload data, but handle errors gracefully
      try {
        await loadData();
      } catch (err) {
        console.error('Error reloading data:', err);
      }
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      if (err.response?.status !== 401) {
        setError(err.response?.data?.error || 'Failed to create data source');
      }
    }
  };

  const handleTestConnection = async (sourceId) => {
    setTesting(true);
    setError('');
    setSuccess('');

    try {
      const result = await api.testDataSource(sourceId);
      if (result.success) {
        setSuccess('Connection test successful!');
      } else {
        setError(result.message || 'Connection test failed');
      }
      setTimeout(() => {
        setSuccess('');
        setError('');
      }, 3000);
    } catch (err) {
      if (err.response?.status !== 401) {
        setError(err.response?.data?.error || err.response?.data?.message || 'Connection test failed');
      }
    } finally {
      setTesting(false);
    }
  };

  const handleFetchData = async (sourceId) => {
    setFetching(true);
    setError('');
    setSuccess('');
    setFetchedData(null);

    try {
      const result = await api.fetchDataSource(sourceId, {
        autoCreate: false // Let user review before creating
      });
      
      if (result.success && result.dataPoints && result.dataPoints.length > 0) {
        setFetchedData(result);
        setShowFetchDialog(sourceId);
        setSuccess(`Fetched ${result.fetchedCount} data points!`);
      } else {
        setError('No data points found for the selected date range');
      }
    } catch (err) {
      if (err.response?.status !== 401) {
        setError(err.response?.data?.error || 'Failed to fetch data');
      }
    } finally {
      setFetching(false);
    }
  };

  const handleCreateFromFetched = async (sourceId, linkToTests = []) => {
    try {
      setError('');
      const result = await api.fetchDataSource(sourceId, {
        autoCreate: true,
        linkToTests: linkToTests
      });
      
      setSuccess(`Created ${result.createdCount} data points!`);
      setShowFetchDialog(null);
      setFetchedData(null);
      
      try {
        await loadData();
      } catch (err) {
        console.error('Error reloading data:', err);
      }
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      if (err.response?.status !== 401) {
        setError(err.response?.data?.error || 'Failed to create data points');
      }
    }
  };

  const handleCreateDataPoint = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!dataPointFormData.sourceId) {
      setError('Please select a data source');
      return;
    }

    try {
      const pointData = {
        ...dataPointFormData,
        value: dataPointFormData.value ? parseFloat(dataPointFormData.value) : null
      };
      await api.createDataPoint(pointData);
      setSuccess('Data point created successfully!');
      setDataPointFormData({ sourceId: selectedSource?.id || '', name: '', value: '', unit: '', metadata: {} });
      setShowDataPointForm(false);
      
      // Reload data, but handle errors gracefully
      try {
        await loadData();
      } catch (err) {
        console.error('Error reloading data:', err);
        // Don't show error to user, just log it - data point was already created
      }
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      // Only show error if it's not a 401 (which would trigger logout)
      if (err.response?.status !== 401) {
        setError(err.response?.data?.error || 'Failed to create data point');
      }
      // If it's a 401, the interceptor will handle logout
    }
  };

  const handleDeleteSource = async (id) => {
    if (!window.confirm('Are you sure you want to delete this data source? All associated data points will need to be deleted first.')) {
      return;
    }

    try {
      await api.deleteDataSource(id);
      setSuccess('Data source deleted successfully!');
      if (selectedSource?.id === id) {
        setSelectedSource(null);
      }
      
      // Reload data, but handle errors gracefully
      try {
        await loadData();
      } catch (err) {
        console.error('Error reloading data:', err);
      }
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      if (err.response?.status !== 401) {
        setError(err.response?.data?.error || 'Failed to delete data source');
      }
    }
  };

  const handleDeleteDataPoint = async (id) => {
    if (!window.confirm('Are you sure you want to delete this data point?')) {
      return;
    }

    try {
      await api.deleteDataPoint(id);
      setSuccess('Data point deleted successfully!');
      
      // Reload data, but handle errors gracefully
      try {
        await loadData();
      } catch (err) {
        console.error('Error reloading data:', err);
      }
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      if (err.response?.status !== 401) {
        setError(err.response?.data?.error || 'Failed to delete data point');
      }
    }
  };

  const handleLinkToTest = async (dataPointId, testId) => {
    try {
      await api.linkDataPointToTest(dataPointId, testId);
      setSuccess('Data point linked to test!');
      
      // Reload data, but handle errors gracefully
      try {
        await loadData();
      } catch (err) {
        console.error('Error reloading data:', err);
      }
      setLinkTestDialog(null);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      if (err.response?.status !== 401) {
        setError(err.response?.data?.error || 'Failed to link data point');
      }
    }
  };

  const handleUnlinkFromTest = async (dataPointId, testId) => {
    try {
      await api.unlinkDataPointFromTest(dataPointId, testId);
      setSuccess('Data point unlinked from test!');
      
      // Reload data, but handle errors gracefully
      try {
        await loadData();
      } catch (err) {
        console.error('Error reloading data:', err);
      }
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      if (err.response?.status !== 401) {
        setError(err.response?.data?.error || 'Failed to unlink data point');
      }
    }
  };

  const getSourceIcon = (type) => {
    switch (type) {
      case 'calling':
        return '📞';
      case 'microsoft-clarity':
        return '👁️';
      case 'linkedin':
        return '💼';
      case 'instagram':
        return '📷';
      default:
        return '📊';
    }
  };

  const getSourceColor = (type) => {
    switch (type) {
      case 'calling':
        return '#4CAF50';
      case 'microsoft-clarity':
        return '#2196F3';
      case 'linkedin':
        return '#0077B5';
      case 'instagram':
        return '#E4405F';
      default:
        return '#9E9E9E';
    }
  };

  // Get all tests from outcomes
  const getAllTests = () => {
    const tests = [];
    (outcomes || []).forEach(outcome => {
      (outcome.opportunities || []).forEach(opp => {
        (opp.solutions || []).forEach(sol => {
          (sol.tests || []).forEach(test => {
            tests.push({
              ...test,
              path: `${outcome.title} > ${opp.title} > ${sol.title} > ${test.title}`
            });
          });
        });
      });
    });
    return tests;
  };

  const filteredDataPoints = selectedSource
    ? dataPoints.filter(dp => dp.sourceId === selectedSource.id)
    : dataPoints;

  if (loading) {
    return <div className="data-inflow-loading">Loading data inflow center...</div>;
  }

  return (
    <div className="data-inflow-center">
      <div className="data-inflow-header">
        <div>
          <h2><FaDatabase /> Data Inflow Center</h2>
          <p className="subtitle">Manage data sources and link metrics to tests</p>
        </div>
        <div className="header-actions">
          <button 
            className="btn-create-source" 
            onClick={() => setShowSourceForm(true)}
          >
            <FaPlus /> Add Data Source
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {/* Data Source Form Modal */}
      {showSourceForm && (
        <div className="modal-overlay" onClick={() => setShowSourceForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create Data Source</h3>
              <button className="btn-close" onClick={() => setShowSourceForm(false)}>
                <FaTimes />
              </button>
            </div>
            <form onSubmit={handleCreateSource}>
              <div className="form-group">
                <label>Source Name *</label>
                <input
                  type="text"
                  value={sourceFormData.name}
                  onChange={(e) => setSourceFormData({ ...sourceFormData, name: e.target.value })}
                  className="form-input"
                  placeholder="e.g., LinkedIn Analytics"
                  required
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>Source Type *</label>
                <select
                  value={sourceFormData.type}
                  onChange={(e) => {
                    setSourceFormData({ ...sourceFormData, type: e.target.value });
                    setShowConfigForm(e.target.value !== 'custom');
                  }}
                  className="form-input"
                  required
                >
                  <option value="calling">📞 Calling Insights</option>
                  <option value="microsoft-clarity">👁️ Microsoft Clarity</option>
                  <option value="linkedin">💼 LinkedIn</option>
                  <option value="instagram">📷 Instagram</option>
                  <option value="custom">📊 Custom</option>
                </select>
              </div>
              
              {/* Configuration Fields for API Integrations */}
              {showConfigForm && sourceFormData.type !== 'custom' && (
                <div className="config-section">
                  <h4>API Configuration</h4>
                  {sourceFormData.type === 'microsoft-clarity' && (
                    <>
                      <div className="form-group">
                        <label>Project ID *</label>
                        <input
                          type="text"
                          value={configFormData.projectId || ''}
                          onChange={(e) => setConfigFormData({ ...configFormData, projectId: e.target.value })}
                          className="form-input"
                          placeholder="Your Clarity Project ID"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>API Key *</label>
                        <input
                          type="password"
                          value={configFormData.apiKey || ''}
                          onChange={(e) => setConfigFormData({ ...configFormData, apiKey: e.target.value })}
                          className="form-input"
                          placeholder="Your Clarity API Key"
                          required
                        />
                      </div>
                    </>
                  )}
                  {sourceFormData.type === 'linkedin' && (
                    <>
                      <div className="form-group">
                        <label>Access Token *</label>
                        <input
                          type="password"
                          value={configFormData.accessToken || ''}
                          onChange={(e) => setConfigFormData({ ...configFormData, accessToken: e.target.value })}
                          className="form-input"
                          placeholder="LinkedIn OAuth Access Token"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Organization ID (URN) *</label>
                        <input
                          type="text"
                          value={configFormData.organizationId || ''}
                          onChange={(e) => setConfigFormData({ ...configFormData, organizationId: e.target.value })}
                          className="form-input"
                          placeholder="urn:li:organization:123456"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Page ID (Optional)</label>
                        <input
                          type="text"
                          value={configFormData.pageId || ''}
                          onChange={(e) => setConfigFormData({ ...configFormData, pageId: e.target.value })}
                          className="form-input"
                          placeholder="LinkedIn Page ID"
                        />
                      </div>
                    </>
                  )}
                  {sourceFormData.type === 'instagram' && (
                    <>
                      <div className="form-group">
                        <label>Access Token *</label>
                        <input
                          type="password"
                          value={configFormData.accessToken || ''}
                          onChange={(e) => setConfigFormData({ ...configFormData, accessToken: e.target.value })}
                          className="form-input"
                          placeholder="Instagram Graph API Access Token"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Business Account ID *</label>
                        <input
                          type="text"
                          value={configFormData.businessAccountId || ''}
                          onChange={(e) => setConfigFormData({ ...configFormData, businessAccountId: e.target.value })}
                          className="form-input"
                          placeholder="Instagram Business Account ID"
                          required
                        />
                      </div>
                    </>
                  )}
                  {sourceFormData.type === 'calling' && (
                    <>
                      <div className="form-group">
                        <label>Platform *</label>
                        <select
                          value={configFormData.platform || 'custom'}
                          onChange={(e) => {
                            const platform = e.target.value;
                            setConfigFormData({ platform });
                            // Reset other fields when platform changes
                            if (platform === 'twilio') {
                              setConfigFormData({ platform, accountSid: '', authToken: '' });
                            } else if (platform === 'ringcentral') {
                              setConfigFormData({ platform, clientId: '', clientSecret: '', accessToken: '' });
                            } else if (platform === 'aircall') {
                              setConfigFormData({ platform, apiId: '', apiToken: '' });
                            } else {
                              setConfigFormData({ platform, apiUrl: '', webhookUrl: '' });
                            }
                          }}
                          className="form-input"
                          required
                        >
                          <option value="twilio">Twilio</option>
                          <option value="ringcentral">RingCentral</option>
                          <option value="aircall">Aircall</option>
                          <option value="custom">Custom API</option>
                        </select>
                      </div>
                      {configFormData.platform === 'twilio' && (
                        <>
                          <div className="form-group">
                            <label>Account SID *</label>
                            <input
                              type="text"
                              value={configFormData.accountSid || ''}
                              onChange={(e) => setConfigFormData({ ...configFormData, accountSid: e.target.value })}
                              className="form-input"
                              placeholder="ACxxxxxxxxxxxxxxxx"
                              required
                            />
                          </div>
                          <div className="form-group">
                            <label>Auth Token *</label>
                            <input
                              type="password"
                              value={configFormData.authToken || ''}
                              onChange={(e) => setConfigFormData({ ...configFormData, authToken: e.target.value })}
                              className="form-input"
                              placeholder="Your Twilio Auth Token"
                              required
                            />
                          </div>
                        </>
                      )}
                      {configFormData.platform === 'ringcentral' && (
                        <>
                          <div className="form-group">
                            <label>Client ID *</label>
                            <input
                              type="text"
                              value={configFormData.clientId || ''}
                              onChange={(e) => setConfigFormData({ ...configFormData, clientId: e.target.value })}
                              className="form-input"
                              required
                            />
                          </div>
                          <div className="form-group">
                            <label>Client Secret *</label>
                            <input
                              type="password"
                              value={configFormData.clientSecret || ''}
                              onChange={(e) => setConfigFormData({ ...configFormData, clientSecret: e.target.value })}
                              className="form-input"
                              required
                            />
                          </div>
                          <div className="form-group">
                            <label>Access Token *</label>
                            <input
                              type="password"
                              value={configFormData.accessToken || ''}
                              onChange={(e) => setConfigFormData({ ...configFormData, accessToken: e.target.value })}
                              className="form-input"
                              required
                            />
                          </div>
                        </>
                      )}
                      {configFormData.platform === 'aircall' && (
                        <>
                          <div className="form-group">
                            <label>API ID *</label>
                            <input
                              type="text"
                              value={configFormData.apiId || ''}
                              onChange={(e) => setConfigFormData({ ...configFormData, apiId: e.target.value })}
                              className="form-input"
                              required
                            />
                          </div>
                          <div className="form-group">
                            <label>API Token *</label>
                            <input
                              type="password"
                              value={configFormData.apiToken || ''}
                              onChange={(e) => setConfigFormData({ ...configFormData, apiToken: e.target.value })}
                              className="form-input"
                              required
                            />
                          </div>
                        </>
                      )}
                      {configFormData.platform === 'custom' && (
                        <>
                          <div className="form-group">
                            <label>API URL</label>
                            <input
                              type="url"
                              value={configFormData.apiUrl || ''}
                              onChange={(e) => setConfigFormData({ ...configFormData, apiUrl: e.target.value })}
                              className="form-input"
                              placeholder="https://api.example.com/data"
                            />
                          </div>
                          <div className="form-group">
                            <label>Webhook URL</label>
                            <input
                              type="url"
                              value={configFormData.webhookUrl || ''}
                              onChange={(e) => setConfigFormData({ ...configFormData, webhookUrl: e.target.value })}
                              className="form-input"
                              placeholder="https://webhook.example.com"
                            />
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
              )}
              
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={sourceFormData.description}
                  onChange={(e) => setSourceFormData({ ...sourceFormData, description: e.target.value })}
                  className="form-input"
                  placeholder="Optional description"
                  rows="3"
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowSourceForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create Source
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="data-inflow-layout">
        {/* Data Sources Sidebar */}
        <div className="data-sources-sidebar">
          <h3>Data Sources</h3>
          <div className="sources-list">
            <div
              className={`source-item ${!selectedSource ? 'selected' : ''}`}
              onClick={() => setSelectedSource(null)}
            >
              <FaChartLine />
              <span>All Sources</span>
              <span className="point-count">({dataPoints.length})</span>
            </div>
            {dataSources.map(source => {
              const pointCount = dataPoints.filter(dp => dp.sourceId === source.id).length;
              const isApiSource = source.type !== 'custom';
              return (
                <div
                  key={source.id}
                  className={`source-item ${selectedSource?.id === source.id ? 'selected' : ''}`}
                >
                  <div 
                    className="source-item-main"
                    onClick={() => setSelectedSource(source)}
                  >
                    <span className="source-icon">{getSourceIcon(source.type)}</span>
                    <span className="source-name">{source.name}</span>
                    <span className="point-count">({pointCount})</span>
                    {!source.isActive && <span className="inactive-badge">Inactive</span>}
                    {isApiSource && <span className="api-badge"><FaPlug /> API</span>}
                  </div>
                  {isApiSource && selectedSource?.id === source.id && (
                    <div className="source-actions" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="btn-test"
                        onClick={() => handleTestConnection(source.id)}
                        disabled={testing}
                        title="Test Connection"
                      >
                        <FaPlug /> {testing ? 'Testing...' : 'Test'}
                      </button>
                      <button
                        className="btn-fetch"
                        onClick={() => handleFetchData(source.id)}
                        disabled={fetching}
                        title="Fetch Data"
                      >
                        <FaSync /> {fetching ? 'Fetching...' : 'Fetch'}
                      </button>
                    </div>
                  )}
                  <button
                    className="btn-icon-small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSource(source.id);
                    }}
                    title="Delete"
                  >
                    <FaTrash />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Data Points Main Area */}
        <div className="data-points-main">
          <div className="data-points-header">
            <h3>
              {selectedSource ? (
                <>
                  <span className="source-icon">{getSourceIcon(selectedSource.type)}</span>
                  {selectedSource.name}
                </>
              ) : (
                'All Data Points'
              )}
            </h3>
            {selectedSource && (
              <button
                className="btn-create-point"
                onClick={() => {
                  setDataPointFormData({ ...dataPointFormData, sourceId: selectedSource.id });
                  setShowDataPointForm(true);
                }}
              >
                <FaPlus /> Add Data Point
              </button>
            )}
          </div>

          {/* Data Point Form */}
          {showDataPointForm && (
            <div className="data-point-form">
              <form onSubmit={handleCreateDataPoint}>
                <div className="form-row">
                  <div className="form-group">
                    <label>Data Point Name *</label>
                    <input
                      type="text"
                      value={dataPointFormData.name}
                      onChange={(e) => setDataPointFormData({ ...dataPointFormData, name: e.target.value })}
                      className="form-input"
                      placeholder="e.g., Page Views"
                      required
                      autoFocus
                    />
                  </div>
                  <div className="form-group">
                    <label>Value</label>
                    <input
                      type="number"
                      step="any"
                      value={dataPointFormData.value}
                      onChange={(e) => setDataPointFormData({ ...dataPointFormData, value: e.target.value })}
                      className="form-input"
                      placeholder="1234"
                    />
                  </div>
                  <div className="form-group">
                    <label>Unit</label>
                    <input
                      type="text"
                      value={dataPointFormData.unit}
                      onChange={(e) => setDataPointFormData({ ...dataPointFormData, unit: e.target.value })}
                      className="form-input"
                      placeholder="e.g., views, clicks, %"
                    />
                  </div>
                </div>
                <div className="form-actions">
                  <button type="button" className="btn-secondary" onClick={() => setShowDataPointForm(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Create Data Point
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Data Points List */}
          <div className="data-points-list">
            {filteredDataPoints.length === 0 ? (
              <div className="empty-state">
                <p>No data points yet</p>
                {selectedSource && (
                  <button
                    className="btn-primary"
                    onClick={() => {
                      setDataPointFormData({ ...dataPointFormData, sourceId: selectedSource.id });
                      setShowDataPointForm(true);
                    }}
                  >
                    Create First Data Point
                  </button>
                )}
              </div>
            ) : (
              filteredDataPoints.map(point => {
                const tests = getAllTests();
                const linkedTests = tests.filter(t => point.linkedTests?.includes(t.id));
                return (
                  <div key={point.id} className="data-point-card">
                    <div className="point-header">
                      <div className="point-info">
                        <h4>{point.name}</h4>
                        <span className="source-badge" style={{ backgroundColor: getSourceColor(point.sourceType) }}>
                          {point.sourceName}
                        </span>
                      </div>
                      <div className="point-actions">
                        <button
                          className="btn-link"
                          onClick={() => setLinkTestDialog(point)}
                          title="Link to Test"
                        >
                          <FaLink /> Link
                        </button>
                        <button
                          className="btn-icon-danger"
                          onClick={() => handleDeleteDataPoint(point.id)}
                          title="Delete"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                    <div className="point-details">
                      {point.value !== null && (
                        <div className="point-value">
                          <strong>{point.value}</strong>
                          {point.unit && <span className="point-unit">{point.unit}</span>}
                        </div>
                      )}
                      {linkedTests.length > 0 && (
                        <div className="linked-tests">
                          <strong>Linked to:</strong>
                          {linkedTests.map(test => (
                            <span key={test.id} className="test-badge">
                              {test.title}
                              <button
                                className="btn-unlink-small"
                                onClick={() => handleUnlinkFromTest(point.id, test.id)}
                                title="Unlink"
                              >
                                <FaUnlink />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Fetch Data Dialog */}
      {showFetchDialog && fetchedData && (
        <div className="modal-overlay" onClick={() => {
          setShowFetchDialog(null);
          setFetchedData(null);
        }}>
          <div className="modal-content fetch-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Fetched Data Points</h3>
              <button className="btn-close" onClick={() => {
                setShowFetchDialog(null);
                setFetchedData(null);
              }}>
                <FaTimes />
              </button>
            </div>
            <div className="fetch-dialog-content">
              <p className="fetch-summary">
                Found <strong>{fetchedData.fetchedCount}</strong> data points from the API.
                Review and create the ones you want to keep.
              </p>
              
              <div className="fetched-points-list">
                {fetchedData.dataPoints.map((point, index) => (
                  <div key={index} className="fetched-point-item">
                    <div className="fetched-point-info">
                      <strong>{point.name}</strong>
                      {point.value !== null && (
                        <span className="fetched-value">
                          {point.value} {point.unit}
                        </span>
                      )}
                      {point.metadata && point.metadata.dateRange && (
                        <small className="fetched-meta">
                          {new Date(point.metadata.dateRange.startDate).toLocaleDateString()} - 
                          {new Date(point.metadata.dateRange.endDate).toLocaleDateString()}
                        </small>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="fetch-actions">
                <button
                  className="btn-secondary"
                  onClick={() => {
                    setShowFetchDialog(null);
                    setFetchedData(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  className="btn-primary"
                  onClick={() => handleCreateFromFetched(showFetchDialog, [])}
                >
                  Create All Data Points
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Link Test Dialog */}
      {linkTestDialog && (
        <div className="modal-overlay" onClick={() => setLinkTestDialog(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Link Data Point to Test</h3>
              <button className="btn-close" onClick={() => setLinkTestDialog(null)}>
                <FaTimes />
              </button>
            </div>
            <div className="link-test-content">
              <p>Select a test to link "{linkTestDialog.name}" to:</p>
              <div className="tests-list">
                {getAllTests().map(test => {
                  const isLinked = linkTestDialog.linkedTests?.includes(test.id);
                  return (
                    <div
                      key={test.id}
                      className={`test-item ${isLinked ? 'linked' : ''}`}
                      onClick={() => {
                        if (isLinked) {
                          handleUnlinkFromTest(linkTestDialog.id, test.id);
                        } else {
                          handleLinkToTest(linkTestDialog.id, test.id);
                        }
                      }}
                    >
                      <div>
                        <strong>{test.title}</strong>
                        <small>{test.path}</small>
                      </div>
                      {isLinked ? (
                        <FaCheck className="linked-icon" />
                      ) : (
                        <FaLink className="link-icon" />
                      )}
                    </div>
                  );
                })}
              </div>
              {getAllTests().length === 0 && (
                <p className="no-tests">No tests available. Create tests in your OST tree first.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataInflowCenter;

