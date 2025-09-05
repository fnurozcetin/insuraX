import React, { useState } from 'react';
import './SignUp.css';

const SignUp = ({ walletInfo, onSignUpComplete, onBackToLogin }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [institutionalData, setInstitutionalData] = useState(null);
  const [dataConsent, setDataConsent] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isFetchingData, setIsFetchingData] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [localWalletInfo, setLocalWalletInfo] = useState(walletInfo || null);

  const showAlert = (message, type) => {
    const alert = { id: Date.now(), message, type };
    setAlerts(prev => [...prev, alert]);
    setTimeout(() => {
      setAlerts(prev => prev.filter(a => a.id !== alert.id));
    }, 5000);
  };

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        showAlert('MetaMask bulunamadı. Lütfen MetaMask kurun.', 'danger');
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
      showAlert('Cüzdan başarıyla bağlandı!', 'success');
    } catch (err) {
      console.error('Wallet connect error:', err);
      showAlert('Cüzdan bağlanırken bir hata oluştu veya işlem iptal edildi.', 'danger');
    }
  };

  const fetchInstitutionalData = async () => {
    try {
      setIsFetchingData(true);
      
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          if (Math.random() < 0.1) {
            reject(new Error('Kurumsal veri sağlayıcılarına bağlanılamadı. Lütfen tekrar deneyin.'));
          } else {
            resolve();
          }
        }, 2000);
      });
      
      const mockData = {
        tcKimlik: '12345678901',
        hastaneKayitlari: [
          { tarih: '2024-01-15', hastane: 'Acıbadem Hastanesi', tani: 'Rutin kontrol', doktor: 'Dr. Mehmet Yılmaz' },
          { tarih: '2023-11-22', hastane: 'Memorial Hastanesi', tani: 'Grip tedavisi', doktor: 'Dr. Ayşe Kaya' }
        ],
        kronikHastaliklar: [],
        riskFaktorleri: ['Sigara kullanımı yok', 'Düzenli spor yapıyor', 'Aile geçmişinde diyabet var']
      };
      
      setInstitutionalData(mockData);
      setIsFetchingData(false);
      showAlert('Kurumsal sağlık verileri başarıyla alındı!', 'success');
      
    } catch (error) {
      setIsFetchingData(false);
      console.error('Data fetching error:', error);
      showAlert(error.message || 'Kurumsal veriler alınırken bir hata oluştu. Lütfen tekrar deneyin.', 'danger');
    }
  };

  const analyzeInstitutionalData = () => {
    if (!dataConsent || !institutionalData) return;
    
    setIsProcessing(true);
    
    setTimeout(() => {
      setCurrentStep(3);
      setIsProcessing(false);
      showAlert('Kurumsal veriler analiz edildi! Size özel prim teklifiniz hazır.', 'success');
    }, 3000);
  };

  const completeRegistration = async () => {
    try {
      setIsProcessing(true);
      
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          if (Math.random() < 0.05) {
            reject(new Error('Blockchain işlemi başarısız oldu. Lütfen tekrar deneyin.'));
          } else {
            resolve();
          }
        }, 1500);
      });
      
      setCurrentStep(4);
      setIsProcessing(false);
      showAlert('Kaydınız başarıyla tamamlandı! PolicyChain ailesine hoş geldiniz.', 'success');
      
    } catch (error) {
      setIsProcessing(false);
      console.error('Registration error:', error);
      showAlert(error.message || 'Kayıt işlemi sırasında bir hata oluştu. Lütfen tekrar deneyin.', 'danger');
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
            PolicyChain
          </button>
          <div className="d-flex">
            {(localWalletInfo || walletInfo)?.address && (
              <span className="navbar-text text-light me-3">
                {(localWalletInfo || walletInfo).address.substring(0, 6)}...{(localWalletInfo || walletInfo).address.substring(38)}
              </span>
            )}
            <button className="btn btn-outline-light btn-sm" onClick={onBackToLogin}>
              <i className="fas fa-arrow-left me-1"></i>
              Geri
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="hero text-center">
        <div className="container">
          <h1 className="display-4 fw-bold">PolicyChain'e Hoş Geldiniz</h1>
          <p className="lead">Merkeziyetsiz sağlık sigortası ile geleceğinizi güvence altına alın</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container my-5">
        <div className="row justify-content-center">
          <div className="col-md-10">
            <div className="card shadow-lg">
              <div className="card-header bg-primary text-white">
                <h3 className="card-title"><i className="fas fa-user-plus me-2"></i>Yeni Hasta Kaydı</h3>
              </div>
              <div className="card-body">
                {/* Registration Steps */}
                <div className="registration-steps">
                  <div className={getStepClass(1)}>
                    <div className="step-number">1</div>
                    <h5>Cüzdan Bağlama</h5>
                  </div>
                  <div className={getStepClass(2)}>
                    <div className="step-number">2</div>
                    <h5>Sağlık Verileri</h5>
                  </div>
                  <div className={getStepClass(3)}>
                    <div className="step-number">3</div>
                    <h5>Risk Analizi</h5>
                  </div>
                  <div className={getStepClass(4)}>
                    <div className="step-number">4</div>
                    <h5>Kayıt Tamamlama</h5>
                  </div>
                </div>

                {/* Step 1: Wallet Connection */}
                {currentStep === 1 && (
                  <div className="step-content">
                    <h4 className="mb-4">Cüzdan Bağlantısı</h4>
                    <p>PolicyChain'e kayıt olmak için öncelikle cüzdanınızı bağlamanız gerekmektedir. Cüzdanınız, kimliğinizi doğrulamak ve işlemleri güvenli bir şekilde gerçekleştirmek için kullanılacaktır.</p>
                    
                    <div className="my-4 p-4 bg-light rounded">
                      <h5><i className="fas fa-info-circle me-2"></i>Neden cüzdan bağlamalıyım?</h5>
                      <ul className="mb-0">
                        <li>Kimliğinizin doğrulanması için</li>
                        <li>Güvenli işlem yapabilmek için</li>
                        <li>Poliçe yönetimi ve talep işlemleri için</li>
                      </ul>
                    </div>
                    
                    <div className="text-center mt-4">
                      <button className="btn btn-primary btn-lg" onClick={connectWallet}>
                        <i className="fas fa-plug me-2"></i>Cüzdanı Bağla
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 2: Institutional Health Data */}
                {currentStep === 2 && (
                  <div className="step-content">
                    <h4 className="mb-4">Kurumsal Sağlık Verilerinizi Alın</h4>
                    <p>Risk analizi için TC Kimlik numaranız ile hastane ve diğer sağlık kurumlarından verilerinizi güvenli şekilde alacağız. Bu veriler blockchain üzerinde şifrelenmiş olarak saklanacaktır.</p>
                    
                    <div className="institutional-data-fetch my-4">
                      <div className="row justify-content-center">
                        <div className="col-md-6">
                          <div className="card border-primary">
                            <div className="card-body text-center">
                              <i className="fas fa-hospital text-primary" style={{ fontSize: '3rem' }}></i>
                              <h5 className="mt-3">Hastane Kayıtları</h5>
                              <p className="text-muted">Özel ve devlet hastanelerinden tıbbi geçmişiniz</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-center mt-4">
                        {!institutionalData && !isFetchingData && (
                          <button className="btn btn-primary btn-lg" onClick={fetchInstitutionalData}>
                            <i className="fas fa-download me-2"></i>
                            Kurumsal Verilerimi Al
                          </button>
                        )}
                        
                        {isFetchingData && (
                          <div className="text-center">
                            <div className="spinner-border text-primary" role="status">
                              <span className="visually-hidden">Veriler alınıyor...</span>
                            </div>
                            <p className="mt-3">Kurumsal verileriniz alınıyor...</p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {institutionalData && (
                      <div className="my-4">
                        <div className="text-center mb-3">
                          <h5><i className="fas fa-check-circle me-2 text-success"></i>Alınan Veriler</h5>
                        </div>
                        <div className="row justify-content-center">
                          <div className="col-md-6">
                            <div className="card">
                              <div className="card-header bg-info text-white">
                                <h6 className="mb-0">Hastane Kayıtları</h6>
                              </div>
                              <div className="card-body">
                                <ul className="list-group list-group-flush">
                                  {institutionalData.hastaneKayitlari.map((kayit, index) => (
                                    <li key={index} className="list-group-item d-flex justify-content-between">
                                      <div>
                                        <strong>{kayit.hastane}</strong><br/>
                                        <small className="text-muted">{kayit.tarih} - {kayit.tanı}</small>
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
                          <h5>Kurumsal Veri Kullanım İzni</h5>
                          <p>PolicyChain'e kurumsal sağlık sistemlerinden aldığım verilerimi blockchain üzerinde şifrelenmiş olarak saklaması ve risk analizi yapması için izin veriyorum. Verilerim yalnızca prim hesaplama amacıyla kullanılacak olup, üçüncü taraflarla paylaşılmayacaktır.</p>
                          <p>Kurumsal verilerimin blockchain üzerinde güvenli saklanması ve yalnızca belirtilen amaçlar doğrultusunda kullanılmasını kabul ediyorum.</p>
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
                            Yukarıdaki kurumsal veri kullanım iznini okudum ve kabul ediyorum
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
                                <span className="loading"></span> Veriler analiz ediliyor...
                              </>
                            ) : (
                              <>
                                <i className="fas fa-chart-line me-2"></i>Kurumsal Verileri Analiz Et
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
                    <h4 className="mb-4">Risk Analizi Sonucunuz</h4>
                    <p>Sağlık verilerinizin analizi tamamlandı. Size özel prim teklifimiz aşağıda belirtilmiştir.</p>
                    
                    <div className="row mt-5">
                      <div className="col-md-6">
                        <div className="card">
                          <div className="card-header bg-info text-white">
                            <h5 className="card-title mb-0">Risk Profiliniz</h5>
                          </div>
                          <div className="card-body">
                            <div className="risk-indicator">
                              <div className="risk-marker" style={{ left: '30%' }}></div>
                            </div>
                            <div className="d-flex justify-content-between">
                              <span>Düşük Risk</span>
                              <span>Orta Risk</span>
                              <span>Yüksek Risk</span>
                            </div>
                            
                            <div className="mt-4">
                              <h6>Risk Değerlendirmesi:</h6>
                              <p>Kurumsal verilerinize göre genel sağlık durumunuz iyi. Düzenli check-up geçmişiniz pozitif faktörler.</p>
                              <div className="mt-3">
                                <small className="text-muted">
                                  <strong>Analiz edilen veriler:</strong><br/>
                                  • {institutionalData?.hastaneKayitlari?.length || 0} hastane kaydı<br/>
                                  • {institutionalData?.riskFaktorleri?.length || 0} risk faktörü değerlendirildi
                                </small>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="col-md-6">
                        <div className="card">
                          <div className="card-header bg-success text-white">
                            <h5 className="card-title mb-0">Prim Teklifi</h5>
                          </div>
                          <div className="card-body">
                            <div className="premium-display">
                              <div className="premium-amount">0.05 ETH</div>
                              <div className="text-muted">Aylık</div>
                            </div>
                            
                            <div className="mt-4">
                              <h6>Poliçe Kapsamı:</h6>
                              <ul>
                                <li>Yılda 10 muayene</li>
                                <li>5.000 TL ye kadar yıllık limit</li>
                                <li>Acil durum kapsamı</li>
                                <li>Check-up hizmeti</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-center mt-5">
                      <button className="btn btn-success btn-lg me-3" onClick={completeRegistration}>
                        <i className="fas fa-check me-2"></i>Kabul Et ve Kaydı Tamamla
                      </button>
                      <button className="btn btn-outline-secondary btn-lg" onClick={onBackToLogin}>
                        <i className="fas fa-times me-2"></i>Reddet
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 4: Completion */}
                {currentStep === 4 && (
                  <div className="step-content">
                    <div className="text-center py-5">
                      <i className="fas fa-check-circle text-success" style={{ fontSize: '5rem' }}></i>
                      <h2 className="mt-4">Kaydınız Tamamlandı!</h2>
                      <p className="lead">PolicyChain ailesine hoş geldiniz. Artık merkeziyetsiz sağlık sigortasının avantajlarından yararlanabilirsiniz.</p>
                      
                      <div className="row justify-content-center mt-5">
                        <div className="col-md-4 mb-4">
                          <div className="card">
                            <div className="card-body">
                              <i className="fas fa-file-invoice text-primary" style={{ fontSize: '3rem' }}></i>
                              <h5 className="mt-3">Poliçenizi Görüntüleyin</h5>
                              <p className="text-muted">Poliçe detaylarınızı inceleyin</p>
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
                          Poliçemi Görüntüle
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
};

export default SignUp;