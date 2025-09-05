import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import WalletConnect from './components/WalletConnect';
import SignUp from './components/SignUp';
import HospitalManagement from './components/HospitalManagement';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('hasta');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);
  const [walletInfo, setWalletInfo] = useState(null);
  const [policyData, setPolicyData] = useState(null);
  const [claims, setClaims] = useState([]);
  const [newClaim, setNewClaim] = useState({ hastaAdres: '', sikayet: '', icdKodu: '', tutar: '' });
  // Admin: Doctors
  const [doctorForm, setDoctorForm] = useState({ firstName: '', lastName: '', hospital: '', wallet: '' });
  const [doctorSaving, setDoctorSaving] = useState(false);
  const [doctorMessage, setDoctorMessage] = useState(null);
  const [doctors, setDoctors] = useState([]);

  // Admin: Hospitals
  const [hospitalForm, setHospitalForm] = useState({ name: '', wallet: '', address: '', phone: '', email: '' });
  const [hospitalSaving, setHospitalSaving] = useState(false);
  const [hospitalMessage, setHospitalMessage] = useState(null);
  const [hospitals, setHospitals] = useState([]);

  // Check for existing wallet connection on app load
  useEffect(() => {
    const checkExistingConnection = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            const chainId = await window.ethereum.request({ method: 'eth_chainId' });
            const savedWalletInfo = {
              address: accounts[0],
              chainId: chainId,
              provider: 'MetaMask'
            };
            setWalletInfo(savedWalletInfo);
            setIsAuthenticated(true);
          }
        } catch (error) {
          console.error('Error checking existing connection:', error);
        }
      }
    };
    
    checkExistingConnection();
  }, []);

  // Load policy data after authentication
  useEffect(() => {
    if (isAuthenticated) {
      // Mock data - in real app, this would be fetched from blockchain
      setPolicyData({
        baslangic: '2023-01-01',
        bitis: '2023-12-31',
        kalanMuayene: 5,
        toplamMuayene: 10,
      });

      setClaims([
        { id: 1, tarih: '2023-05-15', hastane: 'ABC Hastanesi', doktor: 'Dr. Ahmet Yılmaz', tanı: 'J06.9', tutar: '150 TL', durum: 'Ödendi' },
        { id: 2, tarih: '2023-07-22', hastane: 'XYZ Tıp Merkezi', doktor: 'Dr. Ayşe Kaya', tanı: 'M54.5', tutar: '200 TL', durum: 'Beklemede' },
      ]);
    }
  }, [isAuthenticated]);

  // Load doctors and hospitals when Admin tab is active
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const res = await fetch('http://localhost:3001/doctors');
        if (!res.ok) return; // backend may not be running yet
        const data = await res.json();
        setDoctors(Array.isArray(data) ? data : []);
      } catch (e) {
        // ignore fetch errors in UI
      }
    };

    const fetchHospitals = async () => {
      try {
        const res = await fetch('http://localhost:3001/hospitals');
        if (!res.ok) return; // backend may not be running yet
        const data = await res.json();
        setHospitals(data.data || []);
      } catch (e) {
        // ignore fetch errors in UI
      }
    };

    if (activeTab === 'admin') {
      fetchDoctors();
      fetchHospitals();
    }
  }, [activeTab]);

  const handleWalletConnected = (walletData) => {
    setWalletInfo(walletData);
    setIsAuthenticated(true);
    setShowSignUp(false);
  };

  const handleSignUpClick = () => {
    setShowSignUp(true);
  };

  const handleSignUpComplete = (signUpWalletInfo) => {
    console.log('handleSignUpComplete called with:', signUpWalletInfo);
    console.log('Current walletInfo before update:', walletInfo);
    
    // Ensure we preserve the wallet info from signup
    const finalWalletInfo = signUpWalletInfo || walletInfo;
    if (finalWalletInfo) {
      setWalletInfo(finalWalletInfo);
    }
    
    setShowSignUp(false);
    setIsAuthenticated(true);
    console.log('State updated - walletInfo:', finalWalletInfo, 'showSignUp:', false, 'isAuthenticated:', true);
  };

  const handleBackToLogin = () => {
    setShowSignUp(false);
  };

  const disconnectWallet = () => {
    setWalletInfo(null);
    setIsAuthenticated(false);
    setShowSignUp(false);
    setPolicyData(null);
    setClaims([]);
  };

  const handleClaimSubmit = (e) => {
    e.preventDefault();
    alert(`Talep oluşturuldu: ${JSON.stringify(newClaim)}`);
    // Burada blockchain'e talep gönderilecek
    setNewClaim({ hastaAdres: '', sikayet: '', icdKodu: '', tutar: '' });
  };

  // Admin: Doctor form handlers
  const handleDoctorChange = (e) => {
    const { name, value } = e.target;
    setDoctorForm((prev) => ({ ...prev, [name]: value }));
  };

  const submitDoctor = async (e) => {
    e.preventDefault();
    setDoctorMessage(null);
    setDoctorSaving(true);
    try {
      const res = await fetch('http://localhost:3001/doctors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(doctorForm),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || 'Kayıt başarısız');
      }
      const saved = await res.json();
      setDoctorMessage({ type: 'success', text: 'Doktor başarıyla kaydedildi.' });
      setDoctors((prev) => {
        const exists = prev.find((d) => d.wallet?.toLowerCase() === saved.wallet?.toLowerCase());
        if (exists) return prev;
        return [...prev, saved];
      });
      setDoctorForm({ firstName: '', lastName: '', hospital: '', wallet: '' });
    } catch (err) {
      setDoctorMessage({ type: 'error', text: err.message || 'Hata oluştu' });
    } finally {
      setDoctorSaving(false);
    }
  };

  // Admin: Hospital form handlers
  const handleHospitalChange = (e) => {
    const { name, value } = e.target;
    setHospitalForm((prev) => ({ ...prev, [name]: value }));
  };

  const submitHospital = async (e) => {
    e.preventDefault();
    setHospitalMessage(null);
    setHospitalSaving(true);
    try {
      const res = await fetch('http://localhost:3001/hospitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hospitalForm),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || 'Kayıt başarısız');
      }
      const saved = await res.json();
      setHospitalMessage({ type: 'success', text: 'Hastane başarıyla kaydedildi.' });
      setHospitals((prev) => {
        const exists = prev.find((h) => h.wallet?.toLowerCase() === saved.data.wallet?.toLowerCase());
        if (exists) return prev;
        return [...prev, saved.data];
      });
      setHospitalForm({ name: '', wallet: '', address: '', phone: '', email: '' });
    } catch (err) {
      setHospitalMessage({ type: 'error', text: err.message || 'Hata oluştu' });
    } finally {
      setHospitalSaving(false);
    }
  };

  const calculateProgress = () => {
    if (!policyData) return 0;
    return (policyData.kalanMuayene / policyData.toplamMuayene) * 100;
  };

  // Show signup screen if requested
  if (showSignUp) {
    return (
      <SignUp 
        walletInfo={walletInfo}
        onSignUpComplete={handleSignUpComplete}
        onBackToLogin={handleBackToLogin}
      />
    );
  }

  // Show wallet connection screen if not authenticated
  if (!isAuthenticated) {
    return (
      <WalletConnect 
        onWalletConnected={handleWalletConnected}
        onSignUpClick={handleSignUpClick}
      />
    );
  }

  return (
    <div className="App">
      {/* Navbar */}
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
        <div className="container">
          <a className="navbar-brand" href="#">
            <i className="fas fa-shield-alt me-2"></i>
            PolicyChain
          </a>
          <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav me-auto">
              <li className="nav-item">
                <button className={`nav-link btn btn-link ${activeTab === 'hasta' ? 'active' : ''}`} onClick={() => setActiveTab('hasta')}>
                  Poliçem
                </button>
              </li>
              <li className="nav-item">
                <button className={`nav-link btn btn-link ${activeTab === 'doktor' ? 'active' : ''}`} onClick={() => setActiveTab('doktor')}>
                  Doktor
                </button>
              </li>
              <li className="nav-item">
                <button className={`nav-link btn btn-link ${activeTab === 'hastane' ? 'active' : ''}`} onClick={() => setActiveTab('hastane')}>
                  Hastane
                </button>
              </li>
              <li className="nav-item">
                <button className={`nav-link btn btn-link ${activeTab === 'admin' ? 'active' : ''}`} onClick={() => setActiveTab('admin')}>
                  Admin
                </button>
              </li>
            </ul>
            <div className="d-flex align-items-center">
              <span className="navbar-text text-light me-3">
                {walletInfo?.address ? `${walletInfo.address.substring(0, 6)}...${walletInfo.address.substring(38)}` : 'Cüzdan bağlanıyor...'}
              </span>
              <button className="btn btn-outline-light btn-sm" onClick={disconnectWallet}>
                <i className="fas fa-sign-out-alt me-1"></i>
                Çıkış
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container my-5">
        {/* Hasta Paneli */}
        {activeTab === 'hasta' && (
          <div className="row">
            <div className="col-md-8">
              <div className="card shadow-lg">
                <div className="card-header bg-primary text-white">
                  <h3 className="card-title">Poliçe Bilgilerim</h3>
                </div>
                <div className="card-body">
                  {policyData ? (
                    <>
                      <div className="row mb-4">
                        <div className="col-md-6">
                          <p><strong>Başlangıç Tarihi:</strong> {policyData.baslangic}</p>
                          <p><strong>Bitiş Tarihi:</strong> {policyData.bitis}</p>
                        </div>
                        <div className="col-md-6">
                          <p><strong>Kalan Muayene Hakkı:</strong> {policyData.kalanMuayene} / {policyData.toplamMuayene}</p>
                          <div className="progress mt-2">
                            <div 
                              className="progress-bar bg-success" 
                              role="progressbar" 
                              style={{ width: `${calculateProgress()}%` }}
                              aria-valuenow={calculateProgress()} 
                              aria-valuemin="0" 
                              aria-valuemax="100"
                            >
                              {calculateProgress().toFixed(0)}%
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <h4 className="mb-3">Talep Geçmişi</h4>
                      <div className="table-responsive">
                        <table className="table table-striped">
                          <thead>
                            <tr>
                              <th>Tarih</th>
                              <th>Hastane</th>
                              <th>Doktor</th>
                              <th>Tanı (ICD)</th>
                              <th>Tutar</th>
                              <th>Durum</th>
                            </tr>
                          </thead>
                          <tbody>
                            {claims.map(claim => (
                              <tr key={claim.id}>
                                <td>{claim.tarih}</td>
                                <td>{claim.hastane}</td>
                                <td>{claim.doktor}</td>
                                <td>{claim.tanı}</td>
                                <td>{claim.tutar}</td>
                                <td>
                                  <span className={`badge ${claim.durum === 'Ödendi' ? 'bg-success' : 'bg-warning'}`}>
                                    {claim.durum}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : (
                    <p>Poliçe bilgileri yükleniyor...</p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="col-md-4">
              <div className="card shadow-lg">
                <div className="card-header bg-info text-white">
                  <h5 className="card-title">Cüzdan Bilgileri</h5>
                </div>
                <div className="card-body">
                  <p><strong>Adres:</strong> {walletInfo?.address || 'Yükleniyor...'}</p>
                  <p><strong>Sağlayıcı:</strong> {walletInfo?.provider || 'Yükleniyor...'}</p>
                  <p><strong>Bakiye:</strong> 2.45 ETH</p>
                  <button className="btn btn-primary btn-sm">İşlem Geçmişi</button>
                </div>
              </div>
              
              <div className="card shadow-lg mt-4">
                <div className="card-header bg-info text-white">
                  <h5 className="card-title">IPFS Verileri</h5>
                </div>
                <div className="card-body">
                  <button className="btn btn-outline-primary btn-sm me-2">
                    <i className="fas fa-file-medical me-1"></i> Tıbbi Raporlar
                  </button>
                  <button className="btn btn-outline-primary btn-sm">
                    <i className="fas fa-x-ray me-1"></i> Radyolojik Görüntüler
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Doktor Paneli */}
        {activeTab === 'doktor' && (
          <div className="row justify-content-center">
            <div className="col-md-10">
              <div className="card shadow-lg">
                <div className="card-header bg-warning text-dark">
                  <h3 className="card-title">Muayene Kaydı</h3>
                </div>
                <div className="card-body">
                  <form>
                    <div className="row mb-3">
                      <div className="col-md-6">
                        <label className="form-label">Hasta Cüzdan Adresi</label>
                        <input type="text" className="form-control" />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Tarih</label>
                        <input type="date" className="form-control" />
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <label className="form-label">Şikayet</label>
                      <textarea className="form-control" rows="2"></textarea>
                    </div>
                    
                    <div className="mb-3">
                      <label className="form-label">Fizik Muayene Bulguları</label>
                      <textarea className="form-control" rows="3"></textarea>
                    </div>
                    
                    <div className="row mb-3">
                      <div className="col-md-6">
                        <label className="form-label">Tanı (ICD Kodu)</label>
                        <input type="text" className="form-control" />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Maliyet Tahmini (ETH)</label>
                        <input type="number" step="0.001" className="form-control" />
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <label className="form-label">Tedavi ve Tetkik Önerileri</label>
                      <textarea className="form-control" rows="3"></textarea>
                    </div>
                    
                    <button type="submit" className="btn btn-primary me-2">Kaydet</button>
                    <button type="button" className="btn btn-outline-secondary">IPFS'e Yükle</button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Hastane Paneli */}
        {activeTab === 'hastane' && (
          <HospitalManagement walletInfo={walletInfo} />
        )}

        {/* Admin Paneli */}
        {activeTab === 'admin' && (
          <div className="row">
            <div className="col-md-12">
              <h2 className="mb-4">Admin Paneli</h2>
              
              {/* Yeni Doktor Ekle */}
              <div className="card shadow-lg mb-4">
                <div className="card-header bg-secondary text-white">
                  <h4 className="card-title">Yeni Doktor Ekle</h4>
                </div>
                <div className="card-body">
                  {doctorMessage && (
                    <div className={`alert ${doctorMessage.type === 'success' ? 'alert-success' : 'alert-danger'}`} role="alert">
                      {doctorMessage.text}
                    </div>
                  )}
                  <form onSubmit={submitDoctor}>
                    <div className="row g-3">
                      <div className="col-md-3">
                        <label className="form-label">Ad</label>
                        <input name="firstName" value={doctorForm.firstName} onChange={handleDoctorChange} type="text" className="form-control" required />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label">Soyad</label>
                        <input name="lastName" value={doctorForm.lastName} onChange={handleDoctorChange} type="text" className="form-control" required />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label">Hastane</label>
                        <input name="hospital" value={doctorForm.hospital} onChange={handleDoctorChange} type="text" className="form-control" required />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label">Wallet Adresi</label>
                        <input name="wallet" value={doctorForm.wallet} onChange={handleDoctorChange} type="text" className="form-control" required />
                      </div>
                    </div>
                    <div className="mt-3">
                      <button type="submit" className="btn btn-primary" disabled={doctorSaving}>
                        {doctorSaving ? 'Kaydediliyor...' : 'Doktoru Kaydet'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Yeni Hastane Ekle */}
              <div className="card shadow-lg mb-4">
                <div className="card-header bg-primary text-white">
                  <h4 className="card-title">Yeni Hastane Ekle</h4>
                </div>
                <div className="card-body">
                  {hospitalMessage && (
                    <div className={`alert ${hospitalMessage.type === 'success' ? 'alert-success' : 'alert-danger'}`} role="alert">
                      {hospitalMessage.text}
                    </div>
                  )}
                  <form onSubmit={submitHospital}>
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label">Hastane Adı</label>
                        <input name="name" value={hospitalForm.name} onChange={handleHospitalChange} type="text" className="form-control" required />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Wallet Adresi</label>
                        <input name="wallet" value={hospitalForm.wallet} onChange={handleHospitalChange} type="text" className="form-control" required />
                      </div>
                      <div className="col-md-12">
                        <label className="form-label">Adres</label>
                        <textarea name="address" value={hospitalForm.address} onChange={handleHospitalChange} className="form-control" rows="2" required />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Telefon</label>
                        <input name="phone" value={hospitalForm.phone} onChange={handleHospitalChange} type="tel" className="form-control" required />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">E-posta</label>
                        <input name="email" value={hospitalForm.email} onChange={handleHospitalChange} type="email" className="form-control" required />
                      </div>
                    </div>
                    <div className="mt-3">
                      <button type="submit" className="btn btn-primary" disabled={hospitalSaving}>
                        {hospitalSaving ? 'Kaydediliyor...' : 'Hastane Ekle'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Kayıtlı Doktorlar */}
              <div className="card shadow-lg mb-4">
                <div className="card-header">
                  <h4>Kayıtlı Doktorlar</h4>
                </div>
                <div className="card-body">
                  <div className="table-responsive">
                    <table className="table table-striped">
                      <thead>
                        <tr>
                          <th>Ad</th>
                          <th>Soyad</th>
                          <th>Hastane</th>
                          <th>Wallet</th>
                        </tr>
                      </thead>
                      <tbody>
                        {doctors.length === 0 ? (
                          <tr><td colSpan="4" className="text-center">Kayıt yok</td></tr>
                        ) : (
                          doctors.map((d, idx) => (
                            <tr key={idx}>
                              <td>{d.firstName}</td>
                              <td>{d.lastName}</td>
                              <td>{d.hospital}</td>
                              <td>{d.wallet}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Kayıtlı Hastaneler */}
              <div className="card shadow-lg mb-4">
                <div className="card-header">
                  <h4>Kayıtlı Hastaneler</h4>
                </div>
                <div className="card-body">
                  <div className="table-responsive">
                    <table className="table table-striped">
                      <thead>
                        <tr>
                          <th>Hastane Adı</th>
                          <th>Adres</th>
                          <th>Telefon</th>
                          <th>E-posta</th>
                          <th>Wallet</th>
                        </tr>
                      </thead>
                      <tbody>
                        {hospitals.length === 0 ? (
                          <tr><td colSpan="5" className="text-center">Kayıt yok</td></tr>
                        ) : (
                          hospitals.map((h, idx) => (
                            <tr key={idx}>
                              <td><strong>{h.name}</strong></td>
                              <td>{h.address}</td>
                              <td>{h.phone}</td>
                              <td>{h.email}</td>
                              <td><code>{h.wallet.substring(0, 10)}...</code></td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="row mb-4">
                <div className="col-md-3">
                  <div className="card bg-primary text-white text-center p-3 shadow">
                    <h4>Aktif Poliçe</h4>
                    <h2>1,248</h2>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="card bg-success text-white text-center p-3 shadow">
                    <h4>Toplam Havuz</h4>
                    <h2>542.8 ETH</h2>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="card bg-info text-white text-center p-3 shadow">
                    <h4>Bu Ay Talepler</h4>
                    <h2>387</h2>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="card bg-warning text-dark text-center p-3 shadow">
                    <h4>Bekleyen Talepler</h4>
                    <h2>42</h2>
                  </div>
                </div>
              </div>
              
              <div className="card shadow-lg">
                <div className="card-header">
                  <h4>Son İşlemler</h4>
                </div>
                <div className="card-body">
                  <div className="table-responsive">
                    <table className="table table-striped">
                      <thead>
                        <tr>
                          <th>İşlem Hash</th>
                          <th>Tarih</th>
                          <th>Gönderen</th>
                          <th>Alıcı</th>
                          <th>Tutar (ETH)</th>
                          <th>Durum</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>0x8a3f...c7d2</td>
                          <td>2023-08-15 14:32</td>
                          <td>0x5b3a...9f1c</td>
                          <td>0xabc2...4de5</td>
                          <td>0.15</td>
                          <td><span className="badge bg-success">Başarılı</span></td>
                        </tr>
                        <tr>
                          <td>0x7b2c...e9f4</td>
                          <td>2023-08-15 13:21</td>
                          <td>0x9f2d...7a3b</td>
                          <td>0xdef7...2ac8</td>
                          <td>0.08</td>
                          <td><span className="badge bg-success">Başarılı</span></td>
                        </tr>
                        <tr>
                          <td>0x3c8a...d5f1</td>
                          <td>2023-08-15 11:45</td>
                          <td>0x1b4c...8e2d</td>
                          <td>0xghi1...7bf3</td>
                          <td>0.22</td>
                          <td><span className="badge bg-warning">Beklemede</span></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-dark text-light py-4 mt-5">
        <div className="container">
          <div className="row">
            <div className="col-md-6">
              <h5>PolicyChain</h5>
              <p>Merkeziyetsiz sağlık sigortası platformu</p>
            </div>
            <div className="col-md-6 text-end">
              <p>© 2025 PolicyChain. Tüm hakları saklıdır.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;