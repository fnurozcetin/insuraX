import React, { useState } from 'react';
import './WalletConnect.css';

const WalletConnect = ({ onWalletConnected, onSignUpClick, onTestClick }) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState('');

  //connect meta mask
  const connectMetaMask = async () => {
    setIsConnecting(true);
    setError('');
    
    try {
      if (!window.ethereum) {
        throw new Error('MetaMask is not installed. Please install MetaMask first.');
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
      console.error('MetaMask connection error:', error);
      setError(error.message || 'Wallet connection error');
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
              <img src={process.env.PUBLIC_URL + '/logo.jpg'} alt="InsuraX Logo" />
            </div>
            <h1 className="app-title">InsuraX</h1>
            <p className="app-subtitle">Decentralized Health Insurance Platform</p>
          </div>

          <div className="connect-section">
            <h2 className="connect-title">Connect Your Wallet</h2>
            <p className="connect-description">
              Please connect your wallet to access InsuraX.
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
                  <p>Most popular Ethereum wallet</p>
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
              <p>Your connection is secure and encrypted. Your private keys will never be shared.</p>.
            </div>

            <div className="text-center mt-4">
              <p className="text-muted mb-3">Don't have an account yet?</p>
              <div className="d-grid gap-2">
                <button 
                  className="btn btn-outline-primary"
                  onClick={onSignUpClick}
                >
                  <i className="fas fa-user-plus me-2"></i>
                  New Patient Registration
                </button>
                <button 
                  className="btn btn-outline-info"
                  onClick={onTestClick}
                >
                  <i className="fas fa-flask me-2"></i>
                  Test Panel (Developer)
                </button>
              </div>
            </div>
          </div>

          <div className="features-section">
            <h3>Why InsuraX?</h3>
            <div className="features-grid">
              <div className="feature">
                <i className="fas fa-shield-alt"></i>
                <span>Secure and Transparent</span>
              </div>
              <div className="feature">
                <i className="fas fa-coins"></i>
                <span>Low Cost</span>
              </div>
              <div className="feature">
                <i className="fas fa-clock"></i>
                <span>Fast Transactions</span>
              </div>
              <div className="feature">
                <i className="fas fa-users"></i>
                <span>Decentralized</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalletConnect;
