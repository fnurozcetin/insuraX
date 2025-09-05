import React, { useState, useEffect } from 'react';
import './HospitalManagement.css';

const HospitalManagement = ({ walletInfo }) => {
  const [activeTab, setActiveTab] = useState('hospitals');
  const [hospitals, setHospitals] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);



  // Service form state
  const [serviceForm, setServiceForm] = useState({
    name: '',
    type: 'muayene',
    limit: '',
    price: '',
    hospitalWallet: '',
    hospitalName: ''
  });

  // Statistics state
  const [statistics, setStatistics] = useState({
    totalHospitals: 0,
    totalServices: 0,
    totalRevenue: 0,
    activeServices: 0
  });

  useEffect(() => {
    if (activeTab === 'hospitals') {
      fetchHospitals();
    } else if (activeTab === 'services') {
      fetchServices();
    } else if (activeTab === 'statistics') {
      fetchStatistics();
    }
  }, [activeTab]);

  const fetchHospitals = async () => {
    try {
      const response = await fetch('http://localhost:3001/hospitals');
      if (response.ok) {
        const data = await response.json();
        setHospitals(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching hospitals:', error);
    }
  };

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

  const fetchStatistics = async () => {
    try {
      const response = await fetch('http://localhost:3001/hospitals/statistics/overview');
      if (response.ok) {
        const data = await response.json();
        setStatistics(data.data || statistics);
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };



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
        setMessage({ type: 'success', text: 'Hastane hizmeti başarıyla eklendi' });
        setServiceForm({ 
          name: '', 
          type: 'muayene', 
          limit: '', 
          price: '', 
          hospitalWallet: '', 
          hospitalName: '' 
        });
        fetchServices();
      } else {
        setMessage({ type: 'error', text: data.message || 'Hata oluştu' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Hizmet eklenirken hata oluştu' });
    } finally {
      setLoading(false);
    }
  };



  const handleServiceChange = (e) => {
    const { name, value } = e.target;
    setServiceForm(prev => ({ ...prev, [name]: value }));
  };

  const handleUseService = async (serviceId) => {
    if (!walletInfo?.address) {
      setMessage({ type: 'error', text: 'Cüzdan bağlantısı gerekli' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`http://localhost:3001/hospitals/services/${serviceId}/use`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientWallet: walletInfo.address })
      });

      const data = await response.json();
      
      if (data.success) {
        setMessage({ 
          type: 'success', 
          text: `Hizmet kullanıldı. Kalan limit: ${data.data.remainingLimit}` 
        });
        
        // If there's a usage ID, automatically process payment
        if (data.data.usageId) {
          await processPayment(data.data.usageId);
        }
        
        fetchServices();
      } else {
        setMessage({ type: 'error', text: data.message || 'Hizmet kullanılırken hata oluştu' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Hizmet kullanılırken hata oluştu' });
    } finally {
      setLoading(false);
    }
  };

  const processPayment = async (usageId) => {
    try {
      const response = await fetch(`http://localhost:3001/hospitals/services/usage/${usageId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();
      
      if (data.success) {
        setMessage(prev => ({
          type: 'success',
          text: `${prev.text} Ödeme de başarıyla yapıldı.`
        }));
      } else {
        setMessage(prev => ({
          type: 'warning',
          text: `${prev.text} Ancak ödeme işlemi başarısız: ${data.message}`
        }));
      }
    } catch (error) {
      setMessage(prev => ({
        type: 'warning',
        text: `${prev.text} Ancak ödeme işlemi başarısız.`
      }));
    }
  };

  const getServiceTypeLabel = (type) => {
    const labels = {
      'muayene': 'Muayene',
      'radyoloji': 'Radyoloji',
      'mr': 'MR Görüntüleme',
      'laboratuvar': 'Laboratuvar',
      'ameliyat': 'Ameliyat'
    };
    return labels[type] || type;
  };

  return (
    <div className="hospital-management">
      <div className="container-fluid">
        <div className="row">
          <div className="col-12">
            <h2 className="mb-4">
              <i className="fas fa-stethoscope me-2"></i>
              Hastane Hizmet Yönetimi
            </h2>

            {/* Navigation Tabs */}
            <ul className="nav nav-tabs mb-4">
              <li className="nav-item">
                <button 
                  className={`nav-link ${activeTab === 'services' ? 'active' : ''}`}
                  onClick={() => setActiveTab('services')}
                >
                  <i className="fas fa-stethoscope me-1"></i>
                  Hizmet Yönetimi
                </button>
              </li>
              <li className="nav-item">
                <button 
                  className={`nav-link ${activeTab === 'statistics' ? 'active' : ''}`}
                  onClick={() => setActiveTab('statistics')}
                >
                  <i className="fas fa-chart-bar me-1"></i>
                  İstatistikler
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
                        Yeni Hastane Hizmeti Ekle
                      </h5>
                    </div>
                    <div className="card-body">
                      <form onSubmit={handleServiceSubmit}>
                        <div className="mb-3">
                          <label className="form-label">Hastane Adı</label>
                          <input
                            type="text"
                            name="hospitalName"
                            value={serviceForm.hospitalName}
                            onChange={handleServiceChange}
                            className="form-control"
                            required
                          />
                        </div>
                        <div className="mb-3">
                          <label className="form-label">Hizmet Türü</label>
                          <select
                            name="type"
                            value={serviceForm.type}
                            onChange={handleServiceChange}
                            className="form-control"
                            required
                          >
                            <option value="muayene">Muayene</option>
                            <option value="radyoloji">Radyoloji</option>
                            <option value="mr">MR Görüntüleme</option>
                            <option value="laboratuvar">Laboratuvar</option>
                            <option value="ameliyat">Ameliyat</option>
                          </select>
                        </div>
                        <div className="row">
                          <div className="col-md-6">
                            <div className="mb-3">
                              <label className="form-label">Limit</label>
                              <input
                                type="number"
                                name="limit"
                                value={serviceForm.limit}
                                onChange={handleServiceChange}
                                className="form-control"
                                placeholder="Örn: 5"
                                required
                              />
                            </div>
                          </div>
                          <div className="col-md-6">
                            <div className="mb-3">
                              <label className="form-label">Tutar (TL)</label>
                              <input
                                type="number"
                                name="price"
                                value={serviceForm.price}
                                onChange={handleServiceChange}
                                className="form-control"
                                placeholder="Örn: 500"
                                required
                              />
                            </div>
                          </div>
                        </div>
                        <div className="mb-3">
                          <label className="form-label">Hastane Wallet Adresi</label>
                          <input
                            type="text"
                            name="hospitalWallet"
                            value={serviceForm.hospitalWallet}
                            onChange={handleServiceChange}
                            className="form-control"
                            required
                          />
                        </div>
                        <button type="submit" className="btn btn-success" disabled={loading}>
                          {loading ? 'Kaydediliyor...' : 'Hizmet Ekle'}
                        </button>
                      </form>
                    </div>
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="card shadow">
                    <div className="card-header">
                      <h5 className="card-title mb-0">
                        <i className="fas fa-list me-2"></i>
                        Mevcut Hastane Hizmetleri
                      </h5>
                    </div>
                    <div className="card-body">
                      <div className="table-responsive">
                        <table className="table table-striped">
                          <thead>
                            <tr>
                              <th>Hizmet</th>
                              <th>Tür</th>
                              <th>Limit</th>
                              <th>Tutar</th>
                              <th>İşlem</th>
                            </tr>
                          </thead>
                          <tbody>
                            {services.length === 0 ? (
                              <tr>
                                <td colSpan="5" className="text-center text-muted">
                                  Henüz hizmet kaydı yok
                                </td>
                              </tr>
                            ) : (
                              services.map((service) => (
                                <tr key={service.id}>
                                  <td>
                                    <strong>{service.name}</strong>
                                    <br />
                                    <small className="text-muted">{service.hospitalName}</small>
                                  </td>
                                  <td>
                                    <span className="badge bg-info">
                                      {getServiceTypeLabel(service.type)}
                                    </span>
                                  </td>
                                  <td>
                                    <span className={`badge ${service.remainingLimit > 0 ? 'bg-success' : 'bg-danger'}`}>
                                      {service.remainingLimit} / {service.limit}
                                    </span>
                                  </td>
                                  <td>
                                    <strong>{service.price} TL</strong>
                                  </td>
                                  <td>
                                    <button
                                      className="btn btn-sm btn-primary"
                                      onClick={() => handleUseService(service.id)}
                                      disabled={service.remainingLimit <= 0 || loading}
                                    >
                                      <i className="fas fa-play me-1"></i>
                                      Kullan
                                    </button>
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

            {/* Statistics Tab */}
            {activeTab === 'statistics' && (
              <div className="row">
                <div className="col-md-3">
                  <div className="card bg-success text-white text-center p-4 shadow">
                    <h4>Toplam Hizmet</h4>
                    <h2>{statistics.totalServices}</h2>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="card bg-info text-white text-center p-4 shadow">
                    <h4>Toplam Gelir</h4>
                    <h2>{statistics.totalRevenue.toLocaleString()} TL</h2>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="card bg-warning text-dark text-center p-4 shadow">
                    <h4>Aktif Hizmet</h4>
                    <h2>{statistics.activeServices}</h2>
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
