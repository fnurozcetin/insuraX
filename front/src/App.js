import React, { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import WalletConnect from './components/WalletConnect';
import SignUp from './components/SignUp';
import DoctorSignUp from './components/DoctorSignUp';
import HospitalManagement from './components/HospitalManagement';
import TestPanel from './components/TestPanel';
import PolicyManagement from './components/PolicyManagement';
import ServiceRequestManagement from './components/ServiceRequestManagement';
import RiskAnalysis from './components/RiskAnalysis';
import arksignerService from './services/ArksignerService';
import blockchainService from './services/BlockchainService';
import './App.css';
import { Toast, ToastContainer } from 'react-bootstrap';

function App() {
  const [activeTab, setActiveTab] = useState('patient');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);
  const [walletInfo, setWalletInfo] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [policyData, setPolicyData] = useState(null);
  const [claims, setClaims] = useState([]);
  const [patientRights, setPatientRights] = useState(null);
  const [newClaim, setNewClaim] = useState({ patientAddress: '', complaint: '', icdCode: '', sutCode: '', amount: '' });
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

  // Doctor: E-signature
  const [eSignature, setESignature] = useState('');
  const [showDoctorSignUp, setShowDoctorSignUp] = useState(false);
  
  // Test panel
  const [showTestPanel, setShowTestPanel] = useState(false);
  
  // Doctor panel - Arksigner
  const [arksignerStatus, setArksignerStatus] = useState(null);
  const [isSigningDocument, setIsSigningDocument] = useState(false);
  const [documentSignature, setDocumentSignature] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [toastText, setToastText] = useState('');
  const doctorReportFormRef = useRef(null);

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
            
            // Initialize blockchain service
            await blockchainService.initialize(
              process.env.REACT_APP_CONTRACT_ADDRESS || '0x354eCFC21e08A1Dfc045a1565c98C4F26b444c49',
              process.env.REACT_APP_RPC_URL || 'https://sepolia.base.org'
            );
            
            // Determine user role
            await determineUserRole(savedWalletInfo.address);
          }
        } catch (error) {
          console.error('Error checking existing connection:', error);
        }
      }
    };
    
    checkExistingConnection();
  }, []);

  // Check Arksigner status
  useEffect(() => {
    const checkArksigner = () => {
      const status = arksignerService.getStatus();
      setArksignerStatus(status);
    };

    checkArksigner();
    const interval = setInterval(checkArksigner, 2000);
    
    return () => clearInterval(interval);
  }, []);

  // Determine user role based on wallet address
  const determineUserRole = async (walletAddress) => {
    try {
      const response = await fetch('http://localhost:3001/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: walletAddress })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUserRole(data.data.role);
          // Auto-redirect based on role
          switch (data.data.role) {
            case 'admin':
              setActiveTab('admin');
              break;
            case 'hospital':
              setActiveTab('hospital');
              break;
            case 'doctor':
              setActiveTab('doctor');
              break;
            case 'patient':
            default:
              setActiveTab('patient');
              break;
          }
        }
      }
    } catch (error) {
      console.error('Error determining user role:', error);
      // Default to patient if role detection fails
      setUserRole('patient');
      setActiveTab('patient');
    }
  };

  // Load policy data after authentication
  useEffect(() => {
    if (isAuthenticated && walletInfo?.address) {
      loadPolicyData();
    }
  }, [isAuthenticated, walletInfo]);

  const loadPolicyData = async () => {
    try {
      // Always use static/local defaults instead of contract
      const now = new Date();
      const oneYearLater = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

      let defaults = {
        id: 1,
        startDate: now.toISOString(),
        endDate: oneYearLater.toISOString(),
        isActive: true,
        premium: '0.0030',
        coverageAmount: (0.0030 * 100).toString(),
        riskScore: 35,
        rights: {
          examinationRights: 5,
          laboratoryRights: 5,
          radiologyRights: 3,
          outpatientRights: 5,
          advancedDiagnosisRights: 2,
          physiotherapyRights: 5,
          examinationLimit: '1000',
          laboratoryLimit: '1000',
          radiologyLimit: '1000',
          outpatientLimit: '1000',
          advancedDiagnosisLimit: '5000',
          physiotherapyLimit: '1000'
        }
      };

      const localDefaultsRaw = localStorage.getItem('lastCreatedPolicyDefaults');
      if (localDefaultsRaw) {
        try {
          defaults = JSON.parse(localDefaultsRaw);
        } catch (_) {}
      }

      setPolicyData({
        ...defaults,
        remainingVisits: defaults?.rights?.examinationRights ?? 0,
        totalVisits: (defaults?.rights?.examinationRights ?? 0) + 5
      });
      setPatientRights({
        remainingRights: defaults?.rights?.examinationRights ?? 0,
        usedAmount: '0'
      });
      setClaims([]);
      return;
    } catch (error) {
      console.error('Error loading static policy data:', error);
      setPolicyData({
        id: null,
        startDate: null,
        endDate: null,
        isActive: false,
        premium: '0',
        coverageAmount: '0',
        riskScore: null,
        remainingVisits: 0,
        totalVisits: 0,
      });
      setPatientRights(null);
      setClaims([]);
    }
  };

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
      }
    };

    if (activeTab === 'admin') {
      fetchDoctors();
      fetchHospitals();
    }
  }, [activeTab]);

  const handleWalletConnected = async (walletData) => {
    localStorage.removeItem('userLoggedOut');
    
    setWalletInfo(walletData);
    setIsAuthenticated(true);
    setShowSignUp(false);
    
    // Initialize blockchain service
    await blockchainService.initialize(
      process.env.REACT_APP_CONTRACT_ADDRESS || '0x354eCFC21e08A1Dfc045a1565c98C4F26b444c49',
      process.env.REACT_APP_RPC_URL || 'https://sepolia.base.org'
    );
    
    // Determine user role after wallet connection
    await determineUserRole(walletData.address);
  };

  const handleSignUpClick = () => {
    setShowSignUp(true);
  };

  const handleSignUpComplete = (signUpWalletInfo) => {
    console.log('handleSignUpComplete called with:', signUpWalletInfo);
    console.log('Current walletInfo before update:', walletInfo);
    
    localStorage.removeItem('userLoggedOut');
    
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

  const disconnectWallet = async () => {
    try {
      // MetaMask'tan çıkış yap
      if (window.ethereum) {
        // MetaMask'ta gerçek çıkış yapmak için permissions'ı iptal et
        try {
          await window.ethereum.request({
            method: 'wallet_revokePermissions',
            params: [{ eth_accounts: {} }]
          });
        } catch (revokeError) {
          console.log('Revoke permissions error:', revokeError);
          // Eğer revoke çalışmazsa, sadece state'leri temizle
        }
      }
    } catch (error) {
      console.log('MetaMask disconnect error:', error);
      // MetaMask çıkış hatası olsa bile state'leri temizle
    }
        localStorage.setItem('userLoggedOut', 'true');
    
    // State'leri temizle
    setWalletInfo(null);
    setIsAuthenticated(false);
    setShowSignUp(false);
    setShowDoctorSignUp(false);
    setShowTestPanel(false);
    setUserRole(null);
    setPolicyData(null);
    setClaims([]);
    setActiveTab('patient'); // Return to default tab
  };

  // Test login function
  const handleTestLogin = async (role, walletAddress) => {
    const testWalletInfo = {
      address: walletAddress,
      chainId: '0x1',
      provider: 'Test'
    };
    
    setWalletInfo(testWalletInfo);
    setIsAuthenticated(true);
    setShowTestPanel(false);
    setUserRole(role);
    // Ensure blockchain service is initialized for test mode
    try {
      await blockchainService.initialize(
        process.env.REACT_APP_CONTRACT_ADDRESS || '0x354eCFC21e08A1Dfc045a1565c98C4F26b444c49',
        process.env.REACT_APP_RPC_URL || 'https://sepolia.base.org'
      );
    } catch (_) {}
    
    // Auto-redirect based on role
    switch (role) {
      case 'admin':
        setActiveTab('admin');
        break;
      case 'hospital':
        setActiveTab('hospital');
        break;
      case 'doctor':
        setActiveTab('doctor');
        break;
      case 'patient':
      case 'custom':
      default:
        setActiveTab('patient');
        break;
    }
  };

  // Doctor registration
  const handleDoctorSignUp = async (e) => {
    e.preventDefault();
    if (!eSignature.trim()) {
      alert('E-signature required');
      return;
    }

    try {
      const response = await fetch('http://localhost:3001/auth/register/doctor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: walletInfo.address,
          eSignature: eSignature,
          doctorName: `${doctorForm.firstName} ${doctorForm.lastName}`
        })
      });

      const data = await response.json();
      if (data.success) {
        alert('Doctor successfully registered');
        setShowDoctorSignUp(false);
        setESignature('');
        setUserRole('doctor');
        setActiveTab('doctor');
      } else {
        alert(data.message || 'Registration failed');
      }
    } catch (error) {
      alert('Error occurred during registration');
    }
  };

  const handleClaimSubmit = (e) => {
    e.preventDefault();
    alert(`Claim created: ${JSON.stringify(newClaim)}`);
    // Here the claim will be sent to blockchain
    setNewClaim({ patientAddress: '', complaint: '', icdCode: '', sutCode: '', amount: '' });
  };

  // Doctor panel - Document signing with Arksigner
  const handleSignMedicalReport = async (formData) => {
    if (!arksignerStatus?.isInstalled) {
      alert('Arksigner extension is not installed. Please install the extension first.');
      return;
    }

    setIsSigningDocument(true);
    setDocumentSignature(null);

    try {
      const documentData = {
        patientWallet: formData.patientAddress,
        complaint: formData.complaint,
        diagnosis: formData.diagnosis,
        treatment: formData.treatment,
        doctorWallet: walletInfo.address,
        date: new Date().toISOString()
      };

      const result = await arksignerService.signDocument(documentData, 'medical_report');
      setDocumentSignature(result);
      
      if (result.success) {
        setToastText('Medical report successfully signed!');
        setShowToast(true);
        setNewClaim({ patientAddress: '', complaint: '', icdCode: '', sutCode: '', amount: '' });
        if (doctorReportFormRef.current) {
          doctorReportFormRef.current.reset();
        }
      }
    } catch (error) {
      console.error('Document signing error:', error);
      alert('Document signing failed: ' + error.message);
    } finally {
      setIsSigningDocument(false);
    }
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
        throw new Error(txt || 'Registration failed');
      }
      const saved = await res.json();
      setDoctorMessage({ type: 'success', text: 'Doctor successfully saved.' });
      setDoctors((prev) => {
        const exists = prev.find((d) => d.wallet?.toLowerCase() === saved.wallet?.toLowerCase());
        if (exists) return prev;
        return [...prev, saved];
      });
      setDoctorForm({ firstName: '', lastName: '', hospital: '', wallet: '' });
    } catch (err) {
      setDoctorMessage({ type: 'error', text: err.message || 'Error occurred' });
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
        throw new Error(txt || 'Registration failed');
      }
      const saved = await res.json();
      setHospitalMessage({ type: 'success', text: 'Hospital successfully saved.' });
      setHospitals((prev) => {
        const exists = prev.find((h) => h.wallet?.toLowerCase() === saved.data.wallet?.toLowerCase());
        if (exists) return prev;
        return [...prev, saved.data];
      });
      setHospitalForm({ name: '', wallet: '', address: '', phone: '', email: '' });
    } catch (err) {
      setHospitalMessage({ type: 'error', text: err.message || 'Error occurred' });
    } finally {
      setHospitalSaving(false);
    }
  };

  const calculateProgress = () => {
    if (!policyData) return 0;
    return (policyData.remainingVisits / policyData.totalVisits) * 100;
  };

  // Show doctor signup screen if requested
  if (showDoctorSignUp) {
    return (
      <DoctorSignUp 
        walletInfo={walletInfo}
        onSignUpComplete={() => {
          setShowDoctorSignUp(false);
          setUserRole('doctor');
          setActiveTab('doctor');
        }}
        onBackToLogin={() => setShowDoctorSignUp(false)}
      />
    );
  }

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

  // Show test panel if requested
  if (showTestPanel) {
    return (
      <TestPanel onTestLogin={handleTestLogin} />
    );
  }

  // Show wallet connection screen if not authenticated
  if (!isAuthenticated) {
    return (
      <WalletConnect 
        onWalletConnected={handleWalletConnected}
        onSignUpClick={handleSignUpClick}
        onTestClick={() => setShowTestPanel(true)}
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
            InsuraX
          </a>
          <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav me-auto">
              {userRole === 'patient' && (
                <li className="nav-item">
                  <button className={`nav-link btn btn-link ${activeTab === 'patient' ? 'active' : ''}`} onClick={() => setActiveTab('patient')}>
                    <i className="fas fa-user me-1"></i>
                    My Policy
                  </button>
                </li>
              )}
              {userRole === 'doctor' && (
                <li className="nav-item">
                  <button className={`nav-link btn btn-link ${activeTab === 'doctor' ? 'active' : ''}`} onClick={() => setActiveTab('doctor')}>
                    <i className="fas fa-user-md me-1"></i>
                    Doctor Panel
                  </button>
                </li>
              )}
              {userRole === 'hospital' && (
                <li className="nav-item">
                  <button className={`nav-link btn btn-link ${activeTab === 'hospital' ? 'active' : ''}`} onClick={() => setActiveTab('hospital')}>
                    <i className="fas fa-hospital me-1"></i>
                    Hospital Panel
                  </button>
                </li>
              )}
              {userRole === 'admin' && (
                <li className="nav-item">
                  <button className={`nav-link btn btn-link ${activeTab === 'admin' ? 'active' : ''}`} onClick={() => setActiveTab('admin')}>
                    <i className="fas fa-cog me-1"></i>
                    Admin Panel
                  </button>
                </li>
              )}
              {!userRole && (
                <li className="nav-item">
                  <button className={`nav-link btn btn-link ${activeTab === 'patient' ? 'active' : ''}`} onClick={() => setActiveTab('patient')}>
                    <i className="fas fa-user me-1"></i>
                    My Policy
                  </button>
                </li>
              )}
            </ul>
            <div className="d-flex align-items-center">
              <span className="navbar-text text-light me-3">
                <i className={`fas ${userRole === 'admin' ? 'fa-crown' : 
                              userRole === 'doctor' ? 'fa-user-md' : 
                              userRole === 'hospital' ? 'fa-hospital' : 
                              'fa-user'} me-1`}></i>
                {userRole === 'admin' ? 'Admin' : 
                 userRole === 'doctor' ? 'Doctor' : 
                 userRole === 'hospital' ? 'Hospital' : 
                 'Patient'}
              </span>
              <span className="navbar-text text-light me-3">
                {walletInfo?.address ? `${walletInfo.address.substring(0, 6)}...${walletInfo.address.substring(38)}` : 'Connecting wallet...'}
              </span>
              <button className="btn btn-outline-light btn-sm" onClick={disconnectWallet}>
                <i className="fas fa-sign-out-alt me-1"></i>
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container justify-content-center my-5">
        {/* Patient Panel */}
        {activeTab === 'patient' && (userRole === 'patient' || !userRole) && (
          <div className="row justify-content-center">
            <div className="col-lg-12">
              {/* Policy Information */}
              <div className="card shadow-lg">
                <div className="card-header bg-primary text-white">
                  <h3 className="card-title">
                    <i className="fas fa-shield-alt me-2"></i>
                    My Policy Information
                  </h3>
                </div>
                <div className="card-body">
                  {policyData ? (
                    <>
                      {/* Policy Details */}
                      <div className="row mb-4">
                        <div className="col-md-6">
                          <h5><i className="fas fa-calendar me-2"></i>Policy Details</h5>
                          <p><strong>Policy ID:</strong> #{policyData.id || '6551515'}</p>
                          <p><strong>Start Date:</strong> {policyData.startDate ? new Date(policyData.startDate).toLocaleDateString('tr-TR') : 'N/A'}</p>
                          <p><strong>End Date:</strong> {policyData.endDate ? new Date(policyData.endDate).toLocaleDateString('tr-TR') : 'N/A'}</p>
                          <p><strong>Duration:</strong> 1 Year</p>
                          <p><strong>Status:</strong> 
                            <span className={`badge ms-2 ${policyData.isActive ? 'bg-success' : 'bg-danger'}`}>
                              {policyData.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </p>
                        </div>
                        <div className="col-md-6">
                          <h5><i className="fas fa-coins me-2"></i>Financial Details</h5>
                          <p><strong>Total Premium Paid:</strong> {parseFloat(policyData.premium || 0).toFixed(6)} ETH</p>
                          <p><strong>Coverage Amount:</strong> {parseFloat(policyData.coverageAmount || 0).toFixed(6)} ETH</p>
                          <p><strong>Risk Score:</strong> {policyData.riskScore || 'N/A'}</p>
                          <p><strong>Payment Date:</strong> {policyData.startDate ? new Date(policyData.startDate).toLocaleDateString('tr-TR') : 'N/A'}</p>
                        </div>
                      </div>

                      {/* Patient Rights */}
                      {policyData.rights && (
                        <div className="mb-4">
                          <h5><i className="fas fa-user-check me-2"></i>Your Healthcare Rights</h5>
                          <div className="row">
                            <div className="col-md-4">
                              <div className="card bg-light">
                                <div className="card-body text-center">
                                  <h6 className="card-title">Examinations</h6>
                                  <h4 className="text-primary">{policyData.rights.examinationRights}</h4>
                                  <small className="text-muted">Remaining visits</small>
                                </div>
                              </div>
                            </div>
                            <div className="col-md-4">
                              <div className="card bg-light">
                                <div className="card-body text-center">
                                  <h6 className="card-title">Laboratory</h6>
                                  <h4 className="text-info">{policyData.rights.laboratoryRights}</h4>
                                  <small className="text-muted">Remaining tests</small>
                                </div>
                              </div>
                            </div>
                            <div className="col-md-4">
                              <div className="card bg-light">
                                <div className="card-body text-center">
                                  <h6 className="card-title">Radiology</h6>
                                  <h4 className="text-warning">{policyData.rights.radiologyRights}</h4>
                                  <small className="text-muted">Remaining scans</small>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="row mt-2">
                            <div className="col-md-4">
                              <div className="card bg-light">
                                <div className="card-body text-center">
                                  <h6 className="card-title">Outpatient</h6>
                                  <h4 className="text-success">{policyData.rights.outpatientRights}</h4>
                                  <small className="text-muted">Remaining visits</small>
                                </div>
                              </div>
                            </div>
                            <div className="col-md-4">
                              <div className="card bg-light">
                                <div className="card-body text-center">
                                  <h6 className="card-title">Advanced Diagnosis</h6>
                                  <h4 className="text-danger">{policyData.rights.advancedDiagnosisRights}</h4>
                                  <small className="text-muted">Remaining tests</small>
                                </div>
                              </div>
                            </div>
                            <div className="col-md-4">
                              <div className="card bg-light">
                                <div className="card-body text-center">
                                  <h6 className="card-title">Physiotherapy</h6>
                                  <h4 className="text-secondary">{policyData.rights.physiotherapyRights}</h4>
                                  <small className="text-muted">Remaining sessions</small>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Current Rights Status */}
                      {patientRights && (
                        <div className="mb-4">
                          <h5><i className="fas fa-chart-pie me-2"></i>Current Usage</h5>
                          <div className="alert alert-info">
                            <p><strong>Examination Rights:</strong> {patientRights.remainingRights} remaining</p>
                            <p><strong>Used Amount:</strong> {parseFloat(patientRights.usedAmount).toFixed(6)} ETH</p>
                          </div>
                        </div>
                      )}
                      
                      <h4 className="mb-3">
                        <i className="fas fa-history me-2"></i>
                        Claim History
                      </h4>
                      <div className="table-responsive">
                        <table className="table table-striped">
                          <thead>
                            <tr>
                              <th>Date</th>
                              <th>Hospital</th>
                              <th>Doctor</th>
                              <th>Diagnosis (ICD)</th>
                              <th>Amount</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {claims.length > 0 ? (
                              claims.map(claim => (
                                <tr key={claim.id}>
                                  <td>{claim.date}</td>
                                  <td>{claim.hospital}</td>
                                  <td>{claim.doctor}</td>
                                  <td>{claim.diagnosis}</td>
                                  <td>{claim.amount}</td>
                                  <td>
                                    <span className={`badge ${claim.status === 'Paid' ? 'bg-success' : claim.status === 'Pending' ? 'bg-warning' : 'bg-info'}`}>
                                      {claim.status}
                                    </span>
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan="6" className="text-center text-muted">
                                  <i className="fas fa-inbox me-2"></i>
                                  No claims found
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : policyData && !policyData.id ? (
                    <div className="text-center py-5">
                      <i className="fas fa-shield-alt fa-3x text-muted mb-3"></i>
                      <h5 className="text-muted">No Policy Found</h5>
                      <p className="text-muted">You don't have an active health insurance policy yet.</p>
                      <p className="text-muted">Use the Risk Analysis form above to create your first policy.</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                      <p className="mt-2">Loading policy information...</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Doctor Panel */}
        {activeTab === 'doctor' && (
          <div className="row">
            {userRole === 'doctor' ? (
              <div className="col-md-12">
                <div className="card shadow-lg">
                  <div className="card-header bg-warning text-dark">
                    <h3 className="card-title">
                      <i className="fas fa-user-md me-2"></i>
                      Doctor Panel
                    </h3>
                  </div>
                  <div className="card-body">
                    <div className="alert alert-success">
                      <i className="fas fa-check-circle me-2"></i>
                      E-signature verification successful. You are logged in as a doctor.
                    </div>
                    <form ref={doctorReportFormRef}>
                      <div className="row mb-3">
                        <div className="col-md-6">
                          <label className="form-label">Patient Wallet Address</label>  
                          <input 
                            type="text" 
                            className="form-control" 
                            name="patientAddress"
                            value={newClaim.patientAddress}
                            onChange={(e) => setNewClaim(prev => ({...prev, patientAddress: e.target.value}))}
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Date</label>
                          <input type="date" className="form-control" defaultValue={new Date().toISOString().split('T')[0]} />
                        </div>
                      </div>
                      
                      <div className="mb-3">
                        <label className="form-label">Complaint</label>
                        <textarea 
                          className="form-control" 
                          rows="2"
                          name="complaint"
                          value={newClaim.complaint}
                          onChange={(e) => setNewClaim(prev => ({...prev, complaint: e.target.value}))}
                        ></textarea>
                      </div>
                      
                      <div className="mb-3">
                        <label className="form-label">Physical Examination Findings</label>
                        <textarea 
                          className="form-control" 
                          rows="3"
                          name="fizikMuayene"
                        ></textarea>
                      </div>
                      
                      <div className="row mb-3">
                        <div className="col-md-6">
                          <label className="form-label">Diagnosis (ICD Code)</label>
                          <input 
                            type="text" 
                            className="form-control"
                            name="diagnosis"
                            value={newClaim.icdCode}
                            onChange={(e) => setNewClaim(prev => ({...prev, icdCode: e.target.value}))}
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Test (SUT Code)</label>
                          <input 
                            type="text" 
                            className="form-control"
                            name="test"
                            value={newClaim.sutCode}
                            onChange={(e) => setNewClaim(prev => ({...prev, sutCode: e.target.value}))}
                          />
                        </div>
                      </div>
                      
                      <div className="mb-3">
                        <label className="form-label">Treatment and Test Recommendations</label>
                        <textarea 
                          className="form-control" 
                          rows="3"
                          name="treatment"
                        ></textarea>
                      </div>
                      <div className="d-flex gap-2 flex-wrap">
                        <button 
                          type="button" 
                          className="btn btn-primary"
                          onClick={() => handleSignMedicalReport(newClaim)}
                          disabled={!arksignerStatus?.isInstalled || isSigningDocument}
                        >
                          {isSigningDocument ? (
                            <>
                              <i className="fas fa-spinner fa-spin me-1"></i>
                              Signing...
                            </>
                          ) : (
                            <>
                              <i className="fas fa-signature me-1"></i>
                              Sign with Arksigner
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            ) : (
              <div className="col-md-12">
                <div className="card shadow-lg">
                  <div className="card-header bg-info text-white">
                      <h3 className="card-title">
                        <i className="fas fa-user-md me-2"></i>
                        Doctor Registration
                      </h3>
                  </div>
                  <div className="card-body text-center">
                    <p className="lead">You need to register with e-signature to log in as a doctor.</p>
                    <button 
                      className="btn btn-warning btn-lg"
                      onClick={() => setShowDoctorSignUp(true)}
                    >
                      <i className="fas fa-user-plus me-2"></i>
                      Register as Doctor
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Hospital Panel */}
        {activeTab === 'hospital' && userRole === 'hospital' && (
          <HospitalManagement walletInfo={walletInfo} />
        )}

        {/* Admin Panel */}
        {activeTab === 'admin' && userRole === 'admin' && (
          <div className="row">
            <div className="col-md-12">
              <h2 className="mb-4">Admin Panel</h2>
              
              {/* Add New Doctor */}
              <div className="card shadow-lg mb-4">
                <div className="card-header bg-secondary text-white">
                  <h4 className="card-title">Add New Doctor</h4>
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
                        <label className="form-label">First Name</label>
                        <input name="firstName" value={doctorForm.firstName} onChange={handleDoctorChange} type="text" className="form-control" required />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label">Last Name</label>
                        <input name="lastName" value={doctorForm.lastName} onChange={handleDoctorChange} type="text" className="form-control" required />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label">Hospital</label>
                        <input name="hospital" value={doctorForm.hospital} onChange={handleDoctorChange} type="text" className="form-control" required />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label">Wallet Address</label>
                        <input name="wallet" value={doctorForm.wallet} onChange={handleDoctorChange} type="text" className="form-control" required />
                      </div>
                    </div>
                    <div className="mt-3">
                      <button type="submit" className="btn btn-primary" disabled={doctorSaving}>
                        {doctorSaving ? 'Saving...' : 'Save Doctor'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Add New Hospital */}
              <div className="card shadow-lg mb-4">
                <div className="card-header bg-primary text-white">
                  <h4 className="card-title">Add New Hospital</h4>
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
                        <label className="form-label">Hospital Name</label>
                        <input name="name" value={hospitalForm.name} onChange={handleHospitalChange} type="text" className="form-control" required />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Wallet Address</label>
                        <input name="wallet" value={hospitalForm.wallet} onChange={handleHospitalChange} type="text" className="form-control" required />
                      </div>
                      <div className="col-md-12">
                        <label className="form-label">Address</label>
                        <textarea name="address" value={hospitalForm.address} onChange={handleHospitalChange} className="form-control" rows="2" required />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Phone</label>
                        <input name="phone" value={hospitalForm.phone} onChange={handleHospitalChange} type="tel" className="form-control" required />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Email</label>
                        <input name="email" value={hospitalForm.email} onChange={handleHospitalChange} type="email" className="form-control" required />
                      </div>
                    </div>
                    <div className="mt-3">
                      <button type="submit" className="btn btn-primary" disabled={hospitalSaving}>
                        {hospitalSaving ? 'Saving...' : 'Add Hospital'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Registered Doctors */}
              <div className="card shadow-lg mb-4">
                <div className="card-header">
                  <h4>Registered Doctors</h4>
                </div>
                <div className="card-body">
                  <div className="table-responsive">
                    <table className="table table-striped">
                      <thead>
                        <tr>
                          <th>First Name</th>
                          <th>Last Name</th>
                          <th>Hospital</th>
                          <th>Wallet</th>
                        </tr>
                      </thead>
                      <tbody>
                        {doctors.length === 0 ? (
                          <tr><td colSpan="4" className="text-center">No records</td></tr>
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

              {/* Registered Hospitals */}
              <div className="card shadow-lg mb-4">
                <div className="card-header">
                  <h4>Registered Hospitals</h4>
                </div>
                <div className="card-body">
                  <div className="table-responsive">
                    <table className="table table-striped">
                      <thead>
                        <tr>
                          <th>Hospital Name</th>
                          <th>Address</th>
                          <th>Phone</th>
                          <th>Email</th>
                          <th>Wallet</th>
                        </tr>
                      </thead>
                      <tbody>
                        {hospitals.length === 0 ? (
                          <tr><td colSpan="5" className="text-center">No records</td></tr>
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
                    <h4>Active Policies</h4>
                    <h2>1,248</h2>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="card bg-success text-white text-center p-3 shadow">
                    <h4>Total Pool</h4>
                    <h2>542.8 ETH</h2>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="card bg-info text-white text-center p-3 shadow">
                    <h4>This Month Claims</h4>
                    <h2>387</h2>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="card bg-warning text-dark text-center p-3 shadow">
                    <h4>Pending Claims</h4>
                    <h2>42</h2>
                  </div>
                </div>
              </div>
              
              <div className="card shadow-lg">
                <div className="card-header">
                  <h4>Recent Transactions</h4>
                </div>
                <div className="card-body">
                  <div className="table-responsive">
                    <table className="table table-striped">
                      <thead>
                        <tr>
                          <th>Transaction Hash</th>
                          <th>Date</th>
                          <th>From</th>
                          <th>To</th>
                          <th>Amount (ETH)</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>0x8a3f...c7d2</td>
                          <td>2023-08-15 14:32</td>
                          <td>0x5b3a...9f1c</td>
                          <td>0xabc2...4de5</td>
                          <td>0.15</td>
                          <td><span className="badge bg-success">Success</span></td>
                        </tr>
                        <tr>
                          <td>0x7b2c...e9f4</td>
                          <td>2023-08-15 13:21</td>
                          <td>0x9f2d...7a3b</td>
                          <td>0xdef7...2ac8</td>
                          <td>0.08</td>
                          <td><span className="badge bg-success">Success</span></td>
                        </tr>
                        <tr>
                          <td>0x3c8a...d5f1</td>
                          <td>2023-08-15 11:45</td>
                          <td>0x1b4c...8e2d</td>
                          <td>0xghi1...7bf3</td>
                          <td>0.22</td>
                          <td><span className="badge bg-warning">Pending</span></td>
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

      {/* Global Toasts */}
      <ToastContainer position="top-center" className="p-3">
        <Toast onClose={() => setShowToast(false)} show={showToast} delay={2500} autohide bg="success">
          <Toast.Header>
            <strong className="me-auto">Success</strong>
          </Toast.Header>
          <Toast.Body className="text-white">{toastText}</Toast.Body>
        </Toast>
      </ToastContainer>

      {/* Footer */}
      <footer className="bg-dark text-light py-4 mt-5">
        <div className="container">
          <div className="row">
            <div className="col-md-6">
              <h5>InsuraX</h5>
              <p>Decentralized health insurance platform</p>
            </div>
            <div className="col-md-6 text-end">
              <p>© 2025 InsuraX All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;