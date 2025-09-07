import React, { useState } from 'react';
import './TestPanel.css';

//for all role and wallet address, you can test the application
const TestPanel = ({ onTestLogin }) => {
  const [selectedRole, setSelectedRole] = useState('patient');
  const [customWallet, setCustomWallet] = useState('');

  const testWallets = {
    admin: '0x1234567890123456789012345678901234567890',
    hospital1: '0x1234567890123456789012345678901234567890', // hospital
    doctor: '0x3f4A8852f8E2e23EbcD04F4F1b4C10C9a6d1E7c3', // Current doctor
    patient: '0x91d1B869E2F7F4b5C6d0A2c8D7C19fA3E65C08F1' // Test patient
  };

  const handleTestLogin = (role, wallet) => {
    onTestLogin(role, wallet);
  };

  return (
    <div className="test-panel">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-8">
            <div className="card shadow-lg">
              <div className="card-header bg-info text-white">
                <h3 className="card-title text-center">
                  <i className="fas fa-flask me-2"></i>
                  Test Panel - Role Tests
                </h3>
                <div className="text-center mt-2">
                  <small>
                    <i className="fas fa-info-circle me-1"></i>
                    E-signature test mode active - No real e-signature required
                  </small>
                </div>
              </div>
              <div className="card-body">
                <div className="row justify-content-center">
                  <div className="col-md-6 ">
                    <h5>Ready Test Wallets</h5>
                    <div className="d-grid gap-2">
                      <button 
                        className="btn btn-danger"
                        onClick={() => handleTestLogin('admin', testWallets.admin)}
                      >
                        <i className="fas fa-crown me-2"></i>
                        Test as Admin
                      </button>
                      
                      <button 
                        className="btn btn-primary"
                        onClick={() => handleTestLogin('hospital', testWallets.hospital1)}
                      >
                        <i className="fas fa-hospital me-2"></i>
                        Test as Hospital
                      </button>  
                      <button 
                        className="btn btn-warning"
                        onClick={() => handleTestLogin('doctor', testWallets.doctor)}
                      >
                        <i className="fas fa-user-md me-2"></i>
                        Test as Doctor
                      </button>
                      
                      <button 
                        className="btn btn-success"
                        onClick={() => handleTestLogin('patient', testWallets.patient)}
                      >
                        <i className="fas fa-user me-2"></i>
                        Test as Patient
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestPanel;
