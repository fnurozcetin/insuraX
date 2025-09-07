import React, { useState, useEffect } from 'react';
import blockchainService from '../services/BlockchainService';

const ServiceRequestManagement = ({ walletInfo, userRole }) => {
  const [serviceRequests, setServiceRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestForm, setRequestForm] = useState({
    policyId: '',
    patient: '',
    doctor: '',
    icdCode: '',
    sutCode: '',
    amount: ''
  });

  // Load service requests on component mount
  useEffect(() => {
    if (walletInfo?.address && blockchainService.isReady()) {
      loadServiceRequests();
    }
  }, [walletInfo?.address]);

  const loadServiceRequests = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await blockchainService.getPatientServiceRequests(walletInfo.address);
      if (result.success) {
        const requestDetails = await Promise.all(
          result.data.map(async (requestId) => {
            const requestResult = await blockchainService.getServiceRequest(requestId);
            return requestResult.success ? requestResult.data : null;
          })
        );
        setServiceRequests(requestDetails.filter(request => request !== null));
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to load service requests');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestService = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await blockchainService.requestService(
        parseInt(requestForm.policyId),
        requestForm.patient,
        requestForm.doctor,
        requestForm.icdCode,
        requestForm.sutCode,
        requestForm.amount
      );

      if (result.success) {
        alert(`Service request created successfully! Request ID: ${result.requestId}`);
        setRequestForm({
          policyId: '',
          patient: '',
          doctor: '',
          icdCode: '',
          sutCode: '',
          amount: ''
        });
        setShowRequestForm(false);
        loadServiceRequests(); // Reload requests
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to create service request');
    } finally {
      setLoading(false);
    }
  };

  const handlePayForService = async (requestId) => {
    if (!window.confirm('Are you sure you want to pay for this service?')) {
      return;
    }

    setLoading(true);
    try {
      const result = await blockchainService.payForService(requestId);
      if (result.success) {
        alert('Payment completed successfully!');
        loadServiceRequests(); // Reload requests
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to process payment');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('tr-TR');
  };

  const getPaymentStatusBadge = (status) => {
    const statusMap = {
      0: { text: 'Pending', class: 'bg-warning' },
      1: { text: 'Paid by Patient', class: 'bg-info' },
      2: { text: 'Paid by Policy', class: 'bg-success' },
      3: { text: 'Processing', class: 'bg-primary' }
    };
    
    const statusInfo = statusMap[status] || { text: 'Unknown', class: 'bg-secondary' };
    return <span className={`badge ${statusInfo.class}`}>{statusInfo.text}</span>;
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
          <div className="card-header bg-info text-white d-flex justify-content-between align-items-center">
            <h3 className="card-title mb-0">
              <i className="fas fa-file-medical me-2"></i>
              Service Request Management
            </h3>
            <button 
              className="btn btn-light btn-sm"
              onClick={() => setShowRequestForm(!showRequestForm)}
            >
              <i className="fas fa-plus me-1"></i>
              New Request
            </button>
          </div>
          
          <div className="card-body">
            {error && (
              <div className="alert alert-danger">
                <i className="fas fa-exclamation-circle me-2"></i>
                {error}
              </div>
            )}

            {/* Service Request Form */}
            {showRequestForm && (
              <div className="card mb-4">
                <div className="card-header">
                  <h5>Create Service Request</h5>
                </div>
                <div className="card-body">
                  <form onSubmit={handleRequestService}>
                    <div className="row">
                      <div className="col-md-6">
                        <label className="form-label">Policy ID</label>
                        <input
                          type="number"
                          className="form-control"
                          value={requestForm.policyId}
                          onChange={(e) => setRequestForm({...requestForm, policyId: e.target.value})}
                          required
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Patient Address</label>
                        <input
                          type="text"
                          className="form-control"
                          value={requestForm.patient}
                          onChange={(e) => setRequestForm({...requestForm, patient: e.target.value})}
                          required
                        />
                      </div>
                    </div>
                    <div className="row mt-3">
                      <div className="col-md-6">
                        <label className="form-label">Doctor Address</label>
                        <input
                          type="text"
                          className="form-control"
                          value={requestForm.doctor}
                          onChange={(e) => setRequestForm({...requestForm, doctor: e.target.value})}
                          required
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Amount (ETH)</label>
                        <input
                          type="number"
                          step="0.0001"
                          className="form-control"
                          value={requestForm.amount}
                          onChange={(e) => setRequestForm({...requestForm, amount: e.target.value})}
                          required
                        />
                      </div>
                    </div>
                    <div className="row mt-3">
                      <div className="col-md-6">
                        <label className="form-label">ICD Code</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g., A00"
                          value={requestForm.icdCode}
                          onChange={(e) => setRequestForm({...requestForm, icdCode: e.target.value})}
                          required
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">SUT Code</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g., 001"
                          value={requestForm.sutCode}
                          onChange={(e) => setRequestForm({...requestForm, sutCode: e.target.value})}
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
                        {loading ? 'Creating...' : 'Create Request'}
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-secondary"
                        onClick={() => setShowRequestForm(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Service Requests List */}
            {loading ? (
              <div className="text-center py-4">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-2">Loading service requests...</p>
              </div>
            ) : serviceRequests.length === 0 ? (
              <div className="text-center py-4">
                <i className="fas fa-file-medical fa-3x text-muted mb-3"></i>
                <h5>No Service Requests Found</h5>
                <p className="text-muted">You don't have any service requests yet. Create one to get started.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-striped">
                  <thead>
                    <tr>
                      <th>Request ID</th>
                      <th>Policy ID</th>
                      <th>Hospital</th>
                      <th>Doctor</th>
                      <th>ICD Code</th>
                      <th>SUT Code</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Request Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {serviceRequests.map((request) => (
                      <tr key={request.id}>
                        <td><strong>#{request.id}</strong></td>
                        <td>#{request.policyId}</td>
                        <td>
                          <code>{request.hospital.substring(0, 10)}...</code>
                        </td>
                        <td>
                          <code>{request.doctor.substring(0, 10)}...</code>
                        </td>
                        <td><span className="badge bg-secondary">{request.icdCode}</span></td>
                        <td><span className="badge bg-info">{request.sutCode}</span></td>
                        <td>{parseFloat(request.amount).toFixed(4)} ETH</td>
                        <td>{getPaymentStatusBadge(request.paymentStatus)}</td>
                        <td>{formatDate(request.requestDate)}</td>
                        <td>
                          {request.paymentStatus === 1 && (
                            <button 
                              className="btn btn-sm btn-success"
                              onClick={() => handlePayForService(request.id)}
                              disabled={loading}
                            >
                              <i className="fas fa-credit-card me-1"></i>
                              Pay
                            </button>
                          )}
                          {request.paymentStatus === 2 && (
                            <span className="text-success">
                              <i className="fas fa-check-circle"></i>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceRequestManagement;
