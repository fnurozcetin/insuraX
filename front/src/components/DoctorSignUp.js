import React, { useState, useEffect } from 'react';
import arksignerService from '../services/ArksignerService';
import './DoctorSignUp.css';

const DoctorSignUp = ({ walletInfo, onSignUpComplete, onBackToLogin }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    hospital: '',
    eSignature: ''
  });

  const [arksignerStatus, setArksignerStatus] = useState(null);
  const [isSigning, setIsSigning] = useState(false);
  const [signatureResult, setSignatureResult] = useState(null);

  //check arksigner status
  useEffect(() => {
    const checkArksigner = () => {
      const status = arksignerService.getStatus();
      setArksignerStatus(status);
    };
    checkArksigner();    
    const interval = setInterval(checkArksigner, 2000);
    
    return () => clearInterval(interval);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  //arksigner sign
  const handleArksignerSign = async () => {
    if (!formData.firstName || !formData.lastName || !formData.hospital) {
      alert('Please fill all fields');
      return;
    }

    setIsSigning(true);
    setSignatureResult(null);

    try {
      const doctorData = {
        doctorName: `${formData.firstName} ${formData.lastName}`,
        hospital: formData.hospital,
        wallet: walletInfo.address
      };

      const result = await arksignerService.verifyDoctorSignature(doctorData);
      setSignatureResult(result);
      
      if (result.success) {
        //e-signature success, update form data
        setFormData(prev => ({
          ...prev,
          eSignature: result.signature
        }));
        alert('E-signature success! You can now complete the doctor registration.');
      }
    } catch (error) {
      console.error('E-signature error:', error);
      alert('E-signature process failed: ' + error.message);
    } finally {
      setIsSigning(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.eSignature.trim()) {
      alert('E-signature is required. Please sign with Arksigner.');
      return;
    }
    try {
      const response = await fetch('http://localhost:3001/auth/register/doctor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: walletInfo.address,
          eSignature: formData.eSignature,
          doctorName: `${formData.firstName} ${formData.lastName}`,
          hospital: formData.hospital,
          signatureData: signatureResult?.signedData
        })
      });

      const data = await response.json();
      if (data.success) {
        alert('Doctor registered successfully');
        onSignUpComplete();
      } else {
        alert(data.message || 'Registration failed');
      }
    } catch (error) {
      alert('Registration failed');
    }
  };

  return (
    <div className="doctor-signup-container">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-6">
            <div className="card shadow-lg">
              <div className="card-header bg-warning text-dark">
                <h3 className="card-title text-center">
                  <i className="fas fa-user-md me-2"></i>
                  Doctor Registration
                </h3>
              </div>
              <div className="card-body">
                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label className="form-label">First Name</label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      className="form-control"
                      required
                    />
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label">Last Name</label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      className="form-control"
                      required
                    />
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label">Hospital</label>
                    <input
                      type="text"
                      name="hospital"
                      value={formData.hospital}
                      onChange={handleChange}
                      className="form-control"
                      required
                    />
                  </div>
                  

                  {/* E-Signature Field */}
                  <div className="mb-3">
                    <label className="form-label">E-Signature</label>
                    <div className="input-group">
                      <textarea
                        name="eSignature"
                        value={formData.eSignature}
                        onChange={handleChange}
                        className="form-control"
                        rows="3"
                        placeholder="Sign with Arksigner..."
                        readOnly
                      />
                      <button 
                        type="button" 
                        className="btn btn-warning"
                        onClick={handleArksignerSign}
                        disabled={!arksignerStatus?.isInstalled || isSigning}
                      >
                        {isSigning ? (
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
                    <div className="form-text">
                      Sign with Arksigner
                    </div>
                  </div>

                  {/* Signature Result */}
                  {signatureResult && (
                    <div className={`alert ${signatureResult.success ? 'alert-success' : 'alert-danger'}`}>
                      <i className={`fas ${signatureResult.success ? 'fa-check-circle' : 'fa-times-circle'} me-2`}></i>
                      {signatureResult.message}
                    </div>
                  )}
                  
                  <div className="mb-3">
                    <label className="form-label">Wallet Address</label>
                    <input
                      type="text"
                      value={walletInfo?.address || ''}
                      className="form-control"
                      disabled
                    />
                  </div>
                  
                  <div className="d-grid gap-2">
                    <button type="submit" className="btn btn-warning">
                      <i className="fas fa-user-plus me-2"></i>
                      Register as Doctor
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-outline-secondary"
                      onClick={onBackToLogin}
                    >
                      <i className="fas fa-arrow-left me-2"></i>
                      Back
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorSignUp;
