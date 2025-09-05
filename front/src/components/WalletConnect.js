import React, { useState } from 'react';
import './WalletConnect.css';

const WalletConnect = ({ onWalletConnected, onSignUpClick }) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState('');

  const connectMetaMask = async () => {
    setIsConnecting(true);
    setError('');
    
    try {
      if (!window.ethereum) {
        throw new Error('MetaMask yüklü değil. Lütfen MetaMask yükleyin.');
      }

      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      
      if (accounts.length > 0) {
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        
        const walletInfo = {
          address: accounts[0],
          chainId: chainId,
          provider: 'MetaMask'
        };
        
        onWalletConnected(walletInfo);
      }
    } catch (error) {
      console.error('MetaMask bağlantı hatası:', error);
      setError(error.message || 'Cüzdan bağlantısında hata oluştu');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="wallet-connect-container">
      <div className="wallet-connect-background">
        <div className="floating-shapes">
          <div className="shape shape-1"></div>
          <div className="shape shape-2"></div>
          <div className="shape shape-3"></div>
        </div>
      </div>
      
      <div className="wallet-connect-content">
        <div className="wallet-connect-card">
          <div className="logo-section">
            <div className="logo-icon">
              <i className="fas fa-shield-alt"></i>
            </div>
            <h1 className="app-title">PolicyChain</h1>
            <p className="app-subtitle">Merkeziyetsiz Sağlık Sigortası Platformu</p>
          </div>

          <div className="connect-section">
            <h2 className="connect-title">Cüzdanınızı Bağlayın</h2>
            <p className="connect-description">
              PolicyChain'e erişim için lütfen cüzdanınızı bağlayın
            </p>

            {error && (
              <div className="error-message">
                <i className="fas fa-exclamation-triangle"></i>
                {error}
              </div>
            )}

            <div className="wallet-options">
              <button 
                className="wallet-option metamask"
                onClick={connectMetaMask}
                disabled={isConnecting}
              >
                <div className="wallet-icon">
                  <i className="fas fa-bitcoin"></i>
                </div>
                <div className="wallet-info">
                  <h3>MetaMask</h3>
                  <p>En popüler Ethereum cüzdanı</p>
                </div>
                {isConnecting && (
                  <div className="loading-spinner">
                    <i className="fas fa-spinner fa-spin"></i>
                  </div>
                )}
              </button>
            </div>

            <div className="security-note">
              <i className="fas fa-lock"></i>
              <p>Bağlantınız güvenli ve şifrelenmiştir. Özel anahtarlarınız hiçbir zaman paylaşılmaz.</p>
            </div>

            <div className="text-center mt-4">
              <p className="text-muted mb-3">Henüz hesabınız yok mu?</p>
              <button 
                className="btn btn-outline-primary"
                onClick={onSignUpClick}
              >
                <i className="fas fa-user-plus me-2"></i>
                Yeni Hasta Kaydı
              </button>
            </div>
          </div>

          <div className="features-section">
            <h3>Neden PolicyChain?</h3>
            <div className="features-grid">
              <div className="feature">
                <i className="fas fa-shield-alt"></i>
                <span>Güvenli ve Şeffaf</span>
              </div>
              <div className="feature">
                <i className="fas fa-coins"></i>
                <span>Düşük Maliyetli</span>
              </div>
              <div className="feature">
                <i className="fas fa-clock"></i>
                <span>Hızlı İşlemler</span>
              </div>
              <div className="feature">
                <i className="fas fa-users"></i>
                <span>Merkeziyetsiz</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalletConnect;
