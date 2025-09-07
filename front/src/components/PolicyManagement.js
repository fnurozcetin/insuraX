import React, { useState, useEffect } from 'react';
import blockchainService from '../services/BlockchainService';

const PolicyManagement = ({ walletInfo, userRole }) => {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({
    riskScore: '',
    durationInDays: '',
    ipfsHash: ''
  });

  // Load user policies on component mount
  useEffect(() => {
    if (walletInfo?.address && blockchainService.isReady()) {
      loadUserPolicies();
    }
  }, [walletInfo?.address]);

  const loadUserPolicies = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await blockchainService.getUserPolicies(walletInfo.address);
      if (result.success) {
        const policyDetails = await Promise.all(
          result.data.map(async (policyId) => {
            const policyResult = await blockchainService.getPolicy(policyId);
            return policyResult.success ? policyResult.data : null;
          })
        );
        setPolicies(policyDetails.filter(policy => policy !== null));
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to load policies');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePolicy = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await blockchainService.createPolicy(
        walletInfo.address,
        parseInt(createForm.riskScore),
        parseInt(createForm.durationInDays),
        createForm.ipfsHash
      );

      if (result.success) {
        setCreateForm({ riskScore: '', durationInDays: '', ipfsHash: '' });
        setShowCreateForm(false);
        loadUserPolicies(); // Reload policies
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to create policy');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('tr-TR');
  };

  const getStatusBadge = (isActive, endDate) => {
    const now = new Date();
    const end = new Date(endDate);
    
    if (!isActive) return <span className="badge bg-danger">Inactive</span>;
    if (end < now) return <span className="badge bg-warning">Expired</span>;
    return <span className="badge bg-success">Active</span>;
  };

  if (!blockchainService.isReady()) {
    return (
      <div className="alert alert-warning">
        <i className="fas fa-exclamation-triangle me-2"></i>
        Blockchain connection not ready. Please check your wallet connection.
      </div>
    );
  }

  return (
    <div className="row">
      <div className="col-12">
        <div className="card shadow-lg">
          <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
            <h3 className="card-title mb-0">
              <i className="fas fa-shield-alt me-2"></i>
              Policy Management
            </h3>
            <button 
              className="btn btn-light btn-sm"
              onClick={() => setShowCreateForm(!showCreateForm)}
            >
              <i className="fas fa-plus me-1"></i>
              Create Policy
            </button>
          </div>
          
          <div className="card-body">
            {error && (
              <div className="alert alert-danger">
                <i className="fas fa-exclamation-circle me-2"></i>
                {error}
              </div>
            )}

            {/* Create Policy Form */}
            {showCreateForm && (
              <div className="card mb-4">
                <div className="card-header">
                  <h5>Create New Policy</h5>
                </div>
                <div className="card-body">
                  <form onSubmit={handleCreatePolicy}>
                    <div className="row">
                      <div className="col-md-4">
                        <label className="form-label">Risk Score (1-100)</label>
                        <input
                          type="number"
                          className="form-control"
                          min="1"
                          max="100"
                          value={createForm.riskScore}
                          onChange={(e) => setCreateForm({...createForm, riskScore: e.target.value})}
                          required
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Duration (Days)</label>
                        <input
                          type="number"
                          className="form-control"
                          min="1"
                          value={createForm.durationInDays}
                          onChange={(e) => setCreateForm({...createForm, durationInDays: e.target.value})}
                          required
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">IPFS Hash</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Qm..."
                          value={createForm.ipfsHash}
                          onChange={(e) => setCreateForm({...createForm, ipfsHash: e.target.value})}
                          required
                        />
                      </div>
                    </div>
                    <div className="mt-3">
                      <button 
                        type="submit" 
                        className="btn btn-primary me-2"
                        disabled={loading}
                      >
                        {loading ? 'Creating...' : 'Create Policy'}
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-secondary"
                        onClick={() => setShowCreateForm(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Policies List */}
            {loading ? (
              <div className="text-center py-4">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-2">Loading policies...</p>
              </div>
            ) : policies.length === 0 ? (
              <div className="text-center py-4">
                <i className="fas fa-file-contract fa-3x text-muted mb-3"></i>
                <h5>No Policies Found</h5>
                <p className="text-muted">You don't have any policies yet. Create one to get started.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-striped">
                  <thead>
                    <tr>
                      <th>Policy ID</th>
                      <th>Premium</th>
                      <th>Coverage</th>
                      <th>Start Date</th>
                      <th>End Date</th>
                      <th>Risk Score</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {policies.map((policy) => (
                      <tr key={policy.id}>
                        <td><strong>#{policy.id}</strong></td>
                        <td>{parseFloat(policy.premium).toFixed(4)} ETH</td>
                        <td>{parseFloat(policy.coverageAmount).toFixed(4)} ETH</td>
                        <td>{formatDate(policy.startDate)}</td>
                        <td>{formatDate(policy.endDate)}</td>
                        <td>
                          <span className={`badge ${policy.riskScore <= 30 ? 'bg-success' : policy.riskScore <= 60 ? 'bg-warning' : 'bg-danger'}`}>
                            {policy.riskScore}
                          </span>
                        </td>
                        <td>{getStatusBadge(policy.isActive, policy.endDate)}</td>
                        <td>
                          <button 
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => {/* View policy details */}}
                          >
                            <i className="fas fa-eye"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Policy Rights Summary */}
            {policies.length > 0 && (
              <div className="row mt-4">
                <div className="col-12">
                  <h5>Policy Rights Summary</h5>
                  <div className="row">
                    {policies[0]?.rights && Object.entries(policies[0].rights).map(([key, value]) => {
                      if (key.includes('Rights')) {
                        return (
                          <div key={key} className="col-md-4 mb-2">
                            <div className="card bg-light">
                              <div className="card-body p-2">
                                <h6 className="card-title text-capitalize">
                                  {key.replace('Rights', '')}
                                </h6>
                                <p className="card-text mb-0">
                                  <strong>{value}</strong> remaining
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PolicyManagement;
