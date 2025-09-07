import React, { useState, useEffect } from 'react';
import './HospitalManagement.css';

const HospitalManagement = ({ walletInfo }) => {
  const [activeTab, setActiveTab] = useState('services');
  const [services, setServices] = useState([]);
  const [availableServices, setAvailableServices] = useState([]);
  const [selectedService, setSelectedService] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const [serviceForm, setServiceForm] = useState({
    sutCode: '',
    price: '',
    hospitalAddress: walletInfo?.address || ''
  });

  

  // Static service requests list for hospital view (simulated)
  const [serviceRequests, setServiceRequests] = useState([
    {
      id: 1,
      patientWallet: '0x91d1B869E2F7F4b5C6d0A2c8D7C19fA3E65C08F1',
      patientName: 'John Doe',
      icdCode: 'ICD-A10',
      sutCode: 'SUT-001',
      date: new Date().toISOString(),
      ipfsHash: null
    },
    {
      id: 2,
      patientWallet: '0x3f4A8852f8E2e23EbcD04F4F1b4C10C9a6d1E7c3',
      patientName: 'Jane Smith',
      icdCode: 'ICD-B20',
      sutCode: 'SUT-045',
      date: new Date(Date.now() - 86400000).toISOString(),
      ipfsHash: 'sim-1700000000000'
    },
    {
      id: 3,
      patientWallet: '0x1234567890123456789012345678901234567890',
      patientName: 'Michael Brown',
      icdCode: 'ICD-C30',
      sutCode: 'SUT-120',
      date: new Date(Date.now() - 2 * 86400000).toISOString(),
      ipfsHash: null
    }
  ]);

  //fetch services and statistics
  useEffect(() => {
    if (activeTab === 'services') {
      fetchServices();
      fetchAvailableServices();
    }
  }, [activeTab]);

  // Helpers for requests tab
  const formatDate = (iso) => {
    try {
      return new Date(iso).toLocaleString('en-US');
    } catch (_) {
      return '-';
    }
  };

  const uploadToIpfs = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch('http://localhost:3001/ipfs/upload', {
      method: 'POST',
      body: formData
    });
    if (!response.ok) {
      const err = await response.text();
      throw new Error(err || 'Failed to upload to IPFS');
    }
    const data = await response.json();
    return data?.data?.cid || data?.data?.path || data?.cid || data?.path;
  };

  const handleUploadClick = (id) => {
    const el = document.getElementById(`file-input-${id}`);
    if (el) el.click();
  };

  const handleFileChange = async (id, event) => {
    const file = event?.target?.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setMessage({ type: 'error', text: 'Please upload PDF files only.' });
      try { event.target.value = null; } catch (_) {}
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const cid = await uploadToIpfs(file);
      setServiceRequests((prev) => prev.map((r) => (r.id === id ? { ...r, ipfsHash: cid } : r)));
      setMessage({ type: 'success', text: 'PDF report uploaded to IPFS and status marked as paid.' });
    } catch (e) {
      setMessage({ type: 'error', text: 'Report upload failed.' });
    } finally {
      setLoading(false);
      try { event.target.value = null; } catch (_) {}
    }
  };

  //fetch services
  const fetchServices = async () => {
    try {
      const response = await fetch('http://localhost:3001/hospitals/services');
      if (response.ok) {
        const data = await response.json();
        setServices(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  

  //fetch available services for dropdown
  const fetchAvailableServices = async () => {
    try {
      // Fetch current hospital services
      const response = await fetch('http://localhost:3001/hospitals/services');
      if (response.ok) {
        const data = await response.json();
        setAvailableServices(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching available services:', error);
    }
  };

  //submit service
  const handleServiceSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('http://localhost:3001/hospitals/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(serviceForm)
      });

      const data = await response.json();
      
      if (data.success) {
        setMessage({ 
          type: 'success', 
          text: 'Hospital service created successfully' 
        });
        
        // Reset form
        setServiceForm({ 
          sutCode: '', 
          price: '', 
          hospitalAddress: walletInfo?.address || '' 
        });
        
        fetchServices();
      } else {
        setMessage({ type: 'error', text: data.message || 'Error' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error' });
    } finally {
      setLoading(false);
    }
  };

  const handleServiceChange = (e) => {
    const { name, value } = e.target;
    setServiceForm(prev => ({ ...prev, [name]: value }));
  };

  const handleServiceSelection = (e) => {
    const sutCode = e.target.value;
    setSelectedService(sutCode);
    
    // Find the current price of the selected service
    const service = availableServices.find(s => s.sutCode === sutCode);
    if (service) {
      setServiceForm(prev => ({ 
        ...prev, 
        sutCode: sutCode,
        price: service.price.toString()
      }));
    }
  };

  const handleUpdatePrice = async (e) => {
    e.preventDefault();
    
    if (!selectedService) {
      setMessage({ type: 'error', text: 'Please select a service' });
      return;
    }

    if (!serviceForm.price || isNaN(serviceForm.price) || parseFloat(serviceForm.price) <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid price' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:3001/hospitals/services/price', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sutCode: selectedService, 
          newPrice: parseFloat(serviceForm.price) 
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setMessage({ 
          type: 'success', 
          text: 'Service price updated successfully' 
        });
        
        // Reset form
        setSelectedService('');
        setServiceForm({ 
          sutCode: '', 
          price: '', 
          hospitalAddress: walletInfo?.address || '' 
        });
        
        fetchServices();
        fetchAvailableServices();
      } else {
        setMessage({ type: 'error', text: data.message || 'An error occurred while updating the price' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred while updating the price' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="hospital-management">
      <div className="container-fluid">
        <div className="row">
          <div className="col-12">
            <h2 className="mb-4">
              <i className="fas fa-stethoscope me-2"></i>
              Hospital Service Management
            </h2>

            {/* Navigation Tabs */}
            <ul className="nav nav-tabs mb-4">
              <li className="nav-item">
                <button 
                  className={`nav-link ${activeTab === 'services' ? 'active' : ''}`}
                  onClick={() => setActiveTab('services')}
                >
                  <i className="fas fa-stethoscope me-1"></i>
                  Service Management
                </button>
              </li>
              
              <li className="nav-item">
                <button 
                  className={`nav-link ${activeTab === 'requests' ? 'active' : ''}`}
                  onClick={() => setActiveTab('requests')}
                >
                  <i className="fas fa-file-medical me-1"></i>
                  Service Requests
                </button>
              </li>
            </ul>

            {/* Message Display */}
            {message && (
              <div className={`alert ${
                message.type === 'success' ? 'alert-success' : 
                message.type === 'warning' ? 'alert-warning' : 
                'alert-danger'
              } alert-dismissible fade show`} role="alert">
                {message.text}
                <button type="button" className="btn-close" onClick={() => setMessage(null)}></button>
              </div>
            )}

            {/* Services Tab */}
            {activeTab === 'services' && (
              <div className="row">
                <div className="col-md-6">
                  <div className="card shadow">
                    <div className="card-header bg-success text-white">
                      <h5 className="card-title mb-0">
                        <i className="fas fa-plus me-2"></i>
                        Add Hospital Service
                      </h5>
                    </div>
                    <div className="card-body">
                      <form onSubmit={handleServiceSubmit}>
                        <div className="mb-3">
                          <label className="form-label">ICD/SUT Code</label>
                          <input
                            type="text"
                            name="sutCode"
                            value={serviceForm.sutCode}
                            onChange={handleServiceChange}
                            className="form-control"
                            placeholder="e.g., 001"
                            required
                          />
                        </div>
                        <div className="mb-3">
                          <label className="form-label">Price (TRY)</label>
                          <input
                            type="number"
                            name="price"
                            value={serviceForm.price}
                            onChange={handleServiceChange}
                            className="form-control"
                            placeholder="e.g., 100"
                            required
                          />
                        </div>
                        <div className="mb-3">
                          <label className="form-label">Hospital Address</label>
                          <input
                            type="text"
                            name="hospitalAddress"
                            value={serviceForm.hospitalAddress}
                            onChange={handleServiceChange}
                            className="form-control"
                            required
                            readOnly={true}
                          />
                        </div>
                        <button type="submit" className="btn btn-success" disabled={loading}>
                          {loading ? 'Saving...' : 'Add'}
                        </button>
                      </form>
                    </div>
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="card shadow">
                    <div className="card-header bg-warning text-dark">
                      <h5 className="card-title mb-0">
                        <i className="fas fa-edit me-2"></i>
                        Update Service Price
                      </h5>
                    </div>
                    <div className="card-body">
                      <form onSubmit={handleUpdatePrice}>
                        <div className="mb-3">
                          <label className="form-label">Select Service</label>
                          <select
                            className="form-select"
                            value={selectedService}
                            onChange={handleServiceSelection}
                            required
                          >
                            <option value="">Select a service...</option>
                            {availableServices.map((service, index) => (
                              <option key={index} value={service.sutCode}>
                                {service.sutCode} - {service.price} TRY
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="mb-3">
                          <label className="form-label">New Price (TRY)</label>
                          <input
                            type="number"
                            name="price"
                            value={serviceForm.price}
                            onChange={handleServiceChange}
                            className="form-control"
                            placeholder="Enter new price"
                            min="0"
                            step="0.01"
                            required
                          />
                        </div>
                        <button type="submit" className="btn btn-warning" disabled={loading || !selectedService}>
                          {loading ? 'Updating...' : 'Update Price'}
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Services List */}
            {activeTab === 'services' && (
              <div className="row mt-4">
                <div className="col-12">
                  <div className="card shadow">
                    <div className="card-header">
                      <h5 className="card-title mb-0">
                        <i className="fas fa-list me-2"></i>
                        Hospital Services
                      </h5>
                    </div>
                    <div className="card-body">
                      <div className="table-responsive">
                        <table className="table table-striped">
                          <thead>
                            <tr>
                              <th>SUT Code</th>
                              <th>Price (TRY)</th>
                              <th>Status</th>
                              <th>Last Updated</th>
                            </tr>
                          </thead>
                          <tbody>
                            {services.length === 0 ? (
                              <tr>
                                <td colSpan="4" className="text-center text-muted">
                                  No service record yet
                                </td>
                              </tr>
                            ) : (
                              services.map((service, index) => (
                                <tr key={index}>
                                  <td>
                                    <strong>{service.sutCode}</strong>
                                  </td>
                                  <td>
                                    <strong className="text-success">{service.price} TRY</strong>
                                  </td>
                                  <td>
                                    <span className={`badge ${service.isActive ? 'bg-success' : 'bg-danger'}`}>
                                      {service.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                  </td>
                                  <td>
                                    {service.lastUpdated ? new Date(service.lastUpdated * 1000).toLocaleDateString('en-US') : '-'}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            

            {/* Requests Tab */}
            {activeTab === 'requests' && (
              <div className="row">
                <div className="col-12">
                  <div className="card shadow">
                    <div className="card-header">
                      <h5 className="card-title mb-0">
                        <i className="fas fa-clipboard-list me-2"></i>
                        Service Requests
                      </h5>
                    </div>
                    <div className="card-body">
                      <div className="table-responsive">
                        <table className="table table-striped">
                          <thead>
                            <tr>
                              <th>Patient Wallet</th>
                              <th>Full Name</th>
                              <th>ICD Code</th>
                              <th>SUT Code</th>
                              <th>Date</th>
                              <th>Status</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {serviceRequests.length === 0 ? (
                              <tr>
                                <td colSpan="5" className="text-center text-muted">No records</td>
                              </tr>
                            ) : (
                              serviceRequests.map((req) => {
                                const paid = !!req.ipfsHash;
                                return (
                                  <tr key={req.id}>
                                    <td>
                                      <code>{req.patientWallet.slice(0, 6)}...{req.patientWallet.slice(-4)}</code>
                                    </td>
                                    <td>{req.patientName}</td>
                                    <td>{req.icdCode}</td>
                                    <td>{req.sutCode || '-'}</td>
                                    <td>{formatDate(req.date)}</td>
                                    <td>
                                      <span className={`badge ${paid ? 'bg-success' : 'bg-warning text-dark'}`}>
                                        {paid ? 'Paid' : 'Pending'}
                                      </span>
                                    </td>
                                    <td>
                                      {!paid ? (
                                        <>
                                          <input
                                            id={`file-input-${req.id}`}
                                            type="file"
                                            accept="application/pdf"
                                            style={{ display: 'none' }}
                                            onChange={(e) => handleFileChange(req.id, e)}
                                          />
                                          <button
                                            className="btn btn-sm btn-primary"
                                            onClick={() => handleUploadClick(req.id)}
                                            disabled={loading}
                                          >
                                            {loading ? 'Uploading...' : 'Upload Report'}
                                          </button>
                                        </>
                                      ) : (
                                        <a
                                          className="btn btn-sm btn-outline-success"
                                          href={`https://ipfs.io/ipfs/${req.ipfsHash}`}
                                          target="_blank"
                                          rel="noreferrer"
                                        >
                                          View Report
                                        </a>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
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

export default HospitalManagement;