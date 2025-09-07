import React, { useState } from 'react';
import RiskAnalysis from './RiskAnalysis';
import './SignUp.css';

const SignUp = ({ walletInfo, onSignUpComplete, onBackToLogin }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [institutionalData, setInstitutionalData] = useState(null);
  const [dataConsent, setDataConsent] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isFetchingData, setIsFetchingData] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [localWalletInfo, setLocalWalletInfo] = useState(walletInfo || null);
  const [riskData, setRiskData] = useState(null);

  const showAlert = (message, type) => {
    const alert = { id: Date.now(), message, type };
    setAlerts(prev => [...prev, alert]);
    setTimeout(() => {
      setAlerts(prev => prev.filter(a => a.id !== alert.id));
    }, 5000);
  };

  //wallet connect
  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        showAlert('MetaMask not found. Please install MetaMask.', 'danger');
        return;
      }
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      const info = {
        address: accounts[0],
        chainId,
        provider: 'MetaMask',
      };
      setLocalWalletInfo(info);
      setCurrentStep(2);
      showAlert('Wallet connected successfully!', 'success');
    } catch (err) {
      console.error('Wallet connect error:', err);
      showAlert('Wallet connection error or operation cancelled.', 'danger');
    }
  };

  //fetch institutional data from hospital
  const fetchInstitutionalData = async () => {
    try {
      setIsFetchingData(true);
      
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          if (Math.random() < 0.1) {
            reject(new Error('Institutional data providers are not connected. Please try again.'));
          } else {
            resolve();
          }
        }, 2000);
      });
      
      const mockData = {
        tcKimlik: '12345678901',
        hastaneKayitlari: [
          { tarih: '2024-01-15', hastane: 'Hospital A', tani: 'M51.1', doktor: 'Dr. Mehmet Yılmaz' },
          { tarih: '2023-11-22', hastane: 'Hospital B', tani: 'M54.5', doktor: 'Dr. Ayşe Kaya' }
        ],
        kronikHastaliklar: [],
        riskFaktorleri: ['No smoking', 'Regular exercise', 'Family history of diabetes']  
      };
      
      setInstitutionalData(mockData);
      setIsFetchingData(false);
      showAlert('Institutional health data fetched successfully!', 'success');
      
    } catch (error) {
      setIsFetchingData(false);
      console.error('Data fetching error:', error);
      showAlert(error.message || 'Institutional data fetching error. Please try again.', 'danger');
    }
  };

  const analyzeInstitutionalData = () => {
    if (!dataConsent || !institutionalData) return;
    
    setIsProcessing(true);
    
    setTimeout(() => {
      setCurrentStep(3);
      setIsProcessing(false);
      showAlert('Institutional data analyzed! You can now perform risk analysis.', 'success');
    }, 3000);
  };

  const handleRiskCalculated = (data) => {
    setRiskData(data);
    showAlert('Risk analysis completed! Your premium offer is ready.', 'success');
  };

  const completeRegistration = async () => {
    try {
      setIsProcessing(true);
      
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          if (Math.random() < 0.05) {
            reject(new Error('Blockchain operation failed. Please try again.'));
          } else {
            resolve();
          }
        }, 1500);
      });
      
      setCurrentStep(4);
      setIsProcessing(false);
      showAlert('Your registration has been completed successfully! Welcome to InsuraX family.', 'success');
      
    } catch (error) {
      setIsProcessing(false);
      console.error('Registration error:', error);
      showAlert(error.message || 'Registration error. Please try again.', 'danger');
    }
  };

  const getStepClass = (step) => {
    if (step < currentStep) return 'step completed';
    if (step === currentStep) return 'step active';
    return 'step';
  };

  return (
    <div className="signup-container">
      {/* Alerts */}
      {alerts.map(alert => (
        <div 
          key={alert.id}
          className={`alert alert-${alert.type} alert-dismissible fade show position-fixed`}
          style={{ top: '20px', right: '20px', zIndex: 1050, minWidth: '300px' }}
        >
          {alert.message}
          <button 
            type="button" 
            className="btn-close" 
            onClick={() => setAlerts(prev => prev.filter(a => a.id !== alert.id))}
          ></button>
        </div>
      ))}

      {/* Navbar */}
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark sticky-top">
        <div className="container">
          <button className="navbar-brand btn btn-link text-decoration-none" onClick={onBackToLogin}>
            <i className="fas fa-shield-alt me-2"></i>
            InsuraX
          </button>
          <div className="d-flex">
            {(localWalletInfo || walletInfo)?.address && (
              <span className="navbar-text text-light me-3">
                {(localWalletInfo || walletInfo).address.substring(0, 6)}...{(localWalletInfo || walletInfo).address.substring(38)}
              </span>
            )}
            <button className="btn btn-outline-light btn-sm" onClick={onBackToLogin}>
              <i className="fas fa-arrow-left me-1"></i>
              Back
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="hero text-center">
        <div className="container">
          <h1 className="display-4 fw-bold">Welcome to InsuraX</h1>
          <p className="lead">Secure your future with decentralized health insurance</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container my-5">
        <div className="row justify-content-center">
          <div className="col-md-10">
            <div className="card shadow-lg">
              <div className="card-header bg-primary text-white">
                <h3 className="card-title"><i className="fas fa-user-plus me-2"></i>New Patient Registration</h3>
              </div>
              <div className="card-body">
                {/* Registration Steps */}
                <div className="registration-steps">
                  <div className={getStepClass(1)}>
                    <div className="step-number">1</div>
                    <h5>Wallet Connection</h5>
                  </div>
                  <div className={getStepClass(2)}>
                    <div className="step-number">2</div>
                    <h5>Institutional Health Data</h5>
                  </div>
                  <div className={getStepClass(3)}>
                    <div className="step-number">3</div>
                    <h5>Risk Analysis</h5>
                  </div>
                  <div className={getStepClass(4)}>
                    <div className="step-number">4</div>
                    <h5>Registration Completion</h5>
                  </div>
                </div>

                {/* Step 1: Wallet Connection */}
                {currentStep === 1 && (
                  <div className="step-content">
                    <h4 className="mb-4">Wallet Connection</h4>
                    <p>To register for InsuraX, you need to connect your wallet first. Your wallet will be used to verify your identity and perform transactions securely.</p>
                    
                    <div className="my-4 p-4 bg-light rounded">
                      <h5><i className="fas fa-info-circle me-2"></i>Why do I need to connect my wallet?</h5>
                      <ul className="mb-0">
                        <li>To verify your identity</li>
                        <li>To perform transactions securely</li>
                        <li>To manage your policy and claims</li>
                      </ul>
                    </div>
                    
                    <div className="text-center mt-4">
                      <button className="btn btn-primary btn-lg" onClick={connectWallet}>
                        <i className="fas fa-plug me-2"></i>Connect Wallet
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 2: Institutional Health Data */}
                {currentStep === 2 && (
                  <div className="step-content">
                    <h4 className="mb-4">Institutional Health Data</h4>
                    <p>We will securely retrieve your institutional health data from hospitals and other health institutions. These data will be stored encrypted on the blockchain.</p>
                    
                    <div className="institutional-data-fetch my-4">
                      <div className="row justify-content-center">
                        <div className="col-md-6">
                          <div className="card border-primary">
                            <div className="card-body text-center">
                              <i className="fas fa-hospital text-primary" style={{ fontSize: '3rem' }}></i>
                              <h5 className="mt-3">Hospital Records</h5>
                              <p className="text-muted">Your medical history from private and public hospitals</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-center mt-4">
                        {!institutionalData && !isFetchingData && (
                          <button className="btn btn-primary btn-lg" onClick={fetchInstitutionalData}>
                            <i className="fas fa-download me-2"></i>
                            Fetch Institutional Data
                          </button>
                        )}
                        
                        {isFetchingData && (
                          <div className="text-center">
                            <div className="spinner-border text-primary" role="status">
                              <span className="visually-hidden">Fetching data...</span>
                            </div>
                            <p className="mt-3">Fetching institutional data...</p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {institutionalData && (
                      <div className="my-4">
                        <div className="text-center mb-3">
                          <h5><i className="fas fa-check-circle me-2 text-success"></i>Fetched Data</h5>
                        </div>
                        <div className="row justify-content-center">
                          <div className="col-md-6">
                            <div className="card">
                              <div className="card-header bg-info text-white">
                                <h6 className="mb-0">Hospital Records</h6>
                              </div>
                              <div className="card-body">
                                <ul className="list-group list-group-flush">
                                  {institutionalData.hastaneKayitlari.map((kayit, index) => (
                                    <li key={index} className="list-group-item d-flex justify-content-between">
                                      <div>
                                        <strong>{kayit.hastane}</strong><br/>
                                        <small className="text-muted">{kayit.tarih} - {kayit.tani}</small>
                                      </div>
                                      <span className="badge bg-primary">{kayit.icdKodu}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {institutionalData && (
                      <>
                        <div className="consent-box">
                          <h5>Data Usage Permission</h5>
                          <p>InsuraX'e institutional health system from which I obtained data from the blockchain encrypted and stored and risk analysis is permitted. My data will only be used for the purpose of calculating the premium and will not be shared with third parties.</p>
                          <p>I have read and consent to the institutional data usage permission above.</p>
                        </div>
                        
                        <div className="form-check my-4">
                          <input 
                            className="form-check-input" 
                            type="checkbox" 
                            id="data-consent"
                            checked={dataConsent}
                            onChange={(e) => setDataConsent(e.target.checked)}
                          />
                          <label className="form-check-label" htmlFor="data-consent">
                            I have read and consent to the institutional data usage permission above
                          </label>
                        </div>
                        
                        <div className="text-center mt-4">
                          <button 
                            className="btn btn-primary btn-lg" 
                            onClick={analyzeInstitutionalData}
                            disabled={!dataConsent || isProcessing}
                          >
                            {isProcessing ? (
                              <>
                                <span className="loading"></span> Analyzing data...
                              </>
                            ) : (
                              <>
                                <i className="fas fa-chart-line me-2"></i>Analyze Institutional Data
                              </>
                            )}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Step 3: Risk Analysis */}
                {currentStep === 3 && (
                  <div className="step-content">
                    <h4 className="mb-4">Risk Analysis and Premium Calculation</h4>
                    <p>The analysis of your health data has been completed. Now let's perform a detailed risk analysis and calculate your premium offer.</p>
                    
                    <RiskAnalysis 
                      onRiskCalculated={handleRiskCalculated}
                      onViewPolicy={() => {
                        const infoToPass = localWalletInfo || walletInfo;
                        onSignUpComplete(infoToPass);
                      }}
                    />
                    
                    {riskData && (
                      <div className="mt-4">
                        <div className="alert alert-success">
                          <h5><i className="fas fa-check-circle me-2"></i>Risk Analysis Completed!</h5>
                          <p>Your risk score: <strong>{riskData.riskScore}</strong> | Monthly premium: <strong>{riskData.premium} ETH</strong></p>
                        </div>
                        
                        <div className="text-center mt-4">
                          <button className="btn btn-success btn-lg me-3" onClick={completeRegistration}>
                            <i className="fas fa-check me-2"></i>Accept and Complete Registration
                          </button>
                          <button className="btn btn-outline-secondary btn-lg" onClick={onBackToLogin}>
                            <i className="fas fa-times me-2"></i>Reject
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 4: Completion */}
                {currentStep === 4 && (
                  <div className="step-content">
                    <div className="text-center py-5">
                      <i className="fas fa-check-circle text-success" style={{ fontSize: '5rem' }}></i>
                      <h2 className="mt-4">Your Registration is Complete!</h2>
                      <p className="lead">Welcome to InsuraX family. Now you can take advantage of the advantages of decentralized health insurance.</p>
                      
                      <div className="row justify-content-center mt-5">
                        <div className="col-md-4 mb-4">
                          <div className="card">
                            <div className="card-body">
                              <i className="fas fa-file-invoice text-primary" style={{ fontSize: '3rem' }}></i>
                              <h5 className="mt-3">View Your Policy</h5>
                              <p className="text-muted">View your policy details</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <button className="btn btn-primary me-3" onClick={() => {
                          const infoToPass = localWalletInfo || walletInfo;
                          console.log('Manual redirect - walletInfo:', infoToPass);
                          onSignUpComplete(infoToPass);
                        }}>
                          View Your Policy
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

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
};

export default SignUp;