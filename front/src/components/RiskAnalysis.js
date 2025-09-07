import React, { useState } from 'react';
import { ethers } from 'ethers';
import blockchainService from '../services/BlockchainService';

const RiskAnalysis = ({ onRiskCalculated, onViewPolicy }) => {
  const [formData, setFormData] = useState({
    name: 'Fatmanur',
    age: '22',
    gender: 'Female',
    hasChronicDisease: false,
    lifestyle: 'Healthy',
    hasFamilyHistory: false
  });
  const [riskScore, setRiskScore] = useState(null);
  const [premium, setPremium] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPayment, setShowPayment] = useState(false);
  const [isCreatingPolicy, setIsCreatingPolicy] = useState(false);
  const [policyCreated, setPolicyCreated] = useState(false);
  const [policyId, setPolicyId] = useState(null);
  const [tokenInfo, setTokenInfo] = useState(null);
  const [isApproving, setIsApproving] = useState(false);
  const [approvalNeeded, setApprovalNeeded] = useState(false);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // calculate risk score
  const calculateRiskScore = (age, gender, hasChronicDisease, lifestyle, hasFamilyHistory) => {
    let riskScore = 0;
    
    // age factor (0-30 points)
    if (age >= 18 && age <= 25) {
      riskScore += 5;
    } else if (age >= 26 && age <= 35) {
      riskScore += 10;
    } else if (age >= 36 && age <= 45) {
      riskScore += 15;
    } else if (age >= 46 && age <= 55) {
      riskScore += 20;
    } else if (age >= 56 && age <= 65) {
      riskScore += 25;
    } else {
      riskScore += 30;
    }
    
    // gender factor (0-5 points)
    if (gender === 'Male') {
      riskScore += 5;
    }
    
    // chronic disease factor (0-25 points)
    if (hasChronicDisease) {
      riskScore += 25;
    }
    
    // lifestyle factor (0-15 points)
    if (lifestyle === 'Unhealthy') {
      riskScore += 15;
    } else if (lifestyle === 'Normal') {
      riskScore += 8;
    } else if (lifestyle === 'Healthy') {
      riskScore += 0;
    }
    
    // family history factor (0-10 points)
    if (hasFamilyHistory) {
      riskScore += 10;
    }
    
    // limit risk score between 1-100
    if (riskScore > 100) {
      riskScore = 100;
    }
    if (riskScore < 1) {
      riskScore = 1;
    }
    
    return riskScore;
  };

  const calculateRisk = async () => {
    setLoading(true);
    setError(null);

    try {
      // form validation
      if (!formData.name || !formData.age || !formData.gender || !formData.lifestyle) {
        throw new Error('Please fill all fields');
      }

      const age = parseInt(formData.age);
      if (age < 18 || age > 100) {
        throw new Error('Age must be between 18 and 100');
      }

      // calculate risk score
      const calculatedRiskScore = calculateRiskScore(
        age,
        formData.gender,
        formData.hasChronicDisease,
        formData.lifestyle,
        formData.hasFamilyHistory
      );

      setRiskScore(calculatedRiskScore);

      // calculate premium with blockchain service
      if (!blockchainService.isReady()) {
        throw new Error('Blockchain connection not established');
      }

      const premiumResult = await blockchainService.calculatePremium(calculatedRiskScore);
      
      if (premiumResult.success) {
        // Use premium value from service directly
        const reasonablePremium = premiumResult.data.premium;
        setPremium(reasonablePremium);
        
        // Get token information
        const tokenResult = await blockchainService.getPaymentTokenAddress();
        if (tokenResult.success) {
          const currentAccount = await blockchainService.getCurrentAccount();
          if (!currentAccount.success) {
            throw new Error('Failed to get current account');
          }
          const balanceResult = await blockchainService.getTokenBalance(tokenResult.data, currentAccount.address);
          
          if (balanceResult.success) {
            setTokenInfo({
              address: tokenResult.data,
              balance: balanceResult.data.balance,
              allowance: balanceResult.data.allowance,
              decimals: balanceResult.data.decimals
            });
            
            // Check if approval is needed
            const premiumWei = ethers.parseEther(reasonablePremium);
            const allowanceWei = ethers.parseUnits(balanceResult.data.allowance, balanceResult.data.decimals);
            
            console.log('Premium Wei:', premiumWei.toString());
            console.log('Allowance Wei:', allowanceWei.toString());
            console.log('Balance:', balanceResult.data.balance);
            
            if (premiumWei > allowanceWei) {
              setApprovalNeeded(true);
            }
            
            // Check if user has enough balance
            const balanceWei = ethers.parseUnits(balanceResult.data.balance, balanceResult.data.decimals);
            if (premiumWei > balanceWei) {
              throw new Error(`Insufficient token balance. Required: ${reasonablePremium} tokens, Available: ${balanceResult.data.balance} tokens`);
            }
          }
        }
        
        setShowPayment(true);
      } else {
        throw new Error(premiumResult.error || 'Failed to calculate premium');
      }

      // send information to parent component
      if (onRiskCalculated) {
        onRiskCalculated({
          ...formData,
          riskScore: calculatedRiskScore,
          premium: premiumResult.success ? premiumResult.data.premium : '0'
        });
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getRiskLevel = (score) => {
    if (score <= 20) return { level: 'Low', color: 'success' };
    if (score <= 40) return { level: 'Medium-Low', color: 'info' };
    if (score <= 60) return { level: 'Medium', color: 'warning' };
    if (score <= 80) return { level: 'High', color: 'danger' };
    return { level: 'Very High', color: 'dark' };
  };

  const handleApproveToken = async () => {
    setIsApproving(true);
    setError(null);

    try {
      if (!tokenInfo) {
        throw new Error('Token information not available');
      }

      // Approve a larger amount to avoid future approval issues
      const approvalAmount = (parseFloat(premium) * 10).toString(); // Approve 10x the premium amount
      
      const approvalResult = await blockchainService.approveToken(tokenInfo.address, approvalAmount);
      
      if (approvalResult.success) {
        setApprovalNeeded(false);
        alert('Token approval successful! You can now create the policy.');
        
        // Refresh token info to show updated allowance
        const currentAccount = await blockchainService.getCurrentAccount();
        if (!currentAccount.success) {
          throw new Error('Failed to get current account');
        }
        const balanceResult = await blockchainService.getTokenBalance(tokenInfo.address, currentAccount.address);
        if (balanceResult.success) {
          setTokenInfo(prev => ({
            ...prev,
            allowance: balanceResult.data.allowance
          }));
        }
      } else {
        throw new Error(approvalResult.error || 'Failed to approve token');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsApproving(false);
    }
  };

  const handleCreatePolicy = async () => {
    setIsCreatingPolicy(true);
    setError(null);

    try {
      const currentAccount = await blockchainService.getCurrentAccount();
      if (!currentAccount.success) {
        throw new Error('Please connect your wallet first');
      }

      // Check if approval is still needed
      if (approvalNeeded) {
        throw new Error('Please approve token spending first');
      }

      // Create policy with 365 days duration (no IPFS hash required)
      const policyResult = await blockchainService.createPolicy(
        currentAccount.address,
        riskScore,
        365
      );

      if (policyResult.success) {
        if (policyResult.data?.policyId) {
          const details = await blockchainService.getPolicy(policyResult.data.policyId);
          console.log('Created policy details:', details);
        }
        setPolicyId(policyResult.data?.policyId ?? policyResult.policyId);
        setPolicyCreated(true);
        setShowPayment(false);

        // Persist lightweight defaults for immediate My Policy display
        try {
          const now = new Date();
          const oneYearLater = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
          const defaults = {
            id: policyResult.data?.policyId ?? policyResult.policyId ?? null,
            startDate: now.toISOString(),
            endDate: oneYearLater.toISOString(),
            isActive: true,
            premium: premium || '0',
            coverageAmount: premium ? (parseFloat(premium) * 100).toString() : '0',
            riskScore: riskScore ?? null,
            rights: {
              examinationRights: 5,
              laboratoryRights: 5,
              radiologyRights: 3,
              outpatientRights: 5,
              advancedDiagnosisRights: 2,
              physiotherapyRights: 5,
              examinationLimit: '0',
              laboratoryLimit: '0',
              radiologyLimit: '0',
              outpatientLimit: '0',
              advancedDiagnosisLimit: '0',
              physiotherapyLimit: '0'
            }
          };
          localStorage.setItem('lastCreatedPolicyDefaults', JSON.stringify(defaults));
        } catch (_) {}
        
        // Notify parent component to refresh policy data
        if (onRiskCalculated) {
          onRiskCalculated({
            ...formData,
            riskScore: riskScore,
            premium: premium,
            policyCreated: true,
            policyId: policyResult.policyId
          });
        }
      } else {
        throw new Error(policyResult.error || 'Failed to create policy');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsCreatingPolicy(false);
    }
  };

  const handleReset = () => {
    setRiskScore(null);
    setPremium(null);
    setShowPayment(false);
    setPolicyCreated(false);
    setPolicyId(null);
    setError(null);
    setTokenInfo(null);
    setApprovalNeeded(false);
    setIsApproving(false);
  };

  return (
    <div className="card shadow-lg">
      <div className="card-header bg-info text-white">
        <h4 className="card-title">
          <i className="fas fa-calculator me-2"></i>
          Risk Analysis and Premium Calculation
        </h4>
      </div>
      <div className="card-body">
        {error && (
          <div className="alert alert-danger">
            <i className="fas fa-exclamation-circle me-2"></i>
            {error}
          </div>
        )}

        <form>
          <div className="row">
            <div className="col-md-6">
              <div className="mb-3">
                <label className="form-label">Name Surname</label>
                <input
                  type="text"
                  className="form-control"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="For example: Emre Yılmaz"
                />
              </div>
            </div>
            <div className="col-md-6">
              <div className="mb-3">
                <label className="form-label">Age</label>
                <input
                  type="number"
                  className="form-control"
                  name="age"
                  value={formData.age}
                  onChange={handleInputChange}
                  min="18"
                  max="100"
                  placeholder="32"
                />
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-md-6">
              <div className="mb-3">
                <label className="form-label">Gender</label>
                <select
                  className="form-select"
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                >
                  <option value="">Select</option>
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                </select>
              </div>
            </div>
            <div className="col-md-6">
              <div className="mb-3">
                <label className="form-label">Lifestyle</label>
                <select
                  className="form-select"
                  name="lifestyle"
                  value={formData.lifestyle}
                  onChange={handleInputChange}
                >
                  <option value="">Select</option>
                  <option value="Unhealthy">Unhealthy</option>
                  <option value="Normal">Normal</option>
                  <option value="Healthy">Healthy</option>
                </select>
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-md-6">
              <div className="mb-3">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    name="hasChronicDisease"
                    checked={formData.hasChronicDisease}
                    onChange={handleInputChange}
                  />
                  <label className="form-check-label">
                    Has Chronic Disease
                  </label>
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="mb-3">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    name="hasFamilyHistory"
                    checked={formData.hasFamilyHistory}
                    onChange={handleInputChange}
                  />
                  <label className="form-check-label">
                    Has Family History
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="d-grid">
            <button
              type="button"
              className="btn btn-primary btn-lg"
              onClick={calculateRisk}
              disabled={loading}
            >
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin me-2"></i>
                  Calculating...
                </>
              ) : (
                <>
                  <i className="fas fa-calculator me-2"></i>
                  Calculate Risk Analysis
                </>
              )}
            </button>
          </div>
        </form>

        {riskScore !== null && (
          <div className="mt-4">
            <div className="alert alert-info">
              <h5 className="alert-heading">
                <i className="fas fa-chart-line me-2"></i>
                Risk Analysis Result
              </h5>
              <hr />
              <div className="row">
                <div className="col-md-6">
                  <p><strong>Patient:</strong> {formData.name}</p>
                  <p><strong>Age:</strong> {formData.age}</p>
                  <p><strong>Gender:</strong> {formData.gender}</p>
                </div>
                <div className="col-md-6">
                  <p><strong>Lifestyle:</strong> {formData.lifestyle}</p>
                  <p><strong>Chronic Disease:</strong> {formData.hasChronicDisease ? 'Yes' : 'No'}</p>
                  <p><strong>Family History:</strong> {formData.hasFamilyHistory ? 'Yes' : 'No'}</p>
                </div>
              </div>
            </div>

            <div className="row">
              <div className="col-md-6">
                <div className="card bg-light">
                  <div className="card-body text-center">
                    <h6 className="card-title">Risk Score</h6>
                    <h2 className={`text-${getRiskLevel(riskScore).color}`}>
                      {riskScore}
                    </h2>
                    <span className={`badge bg-${getRiskLevel(riskScore).color}`}>
                      {getRiskLevel(riskScore).level}
                    </span>
                  </div>
                </div>
              </div>
              <div className="col-md-6">
                <div className="card bg-light">
                  <div className="card-body text-center">
                    <h6 className="card-title">Monthly Premium</h6>
                    <h2 className="text-primary">
                      {premium ? `${parseFloat(premium).toFixed(4)} ETH` : 'Calculating...'}
                    </h2>
                    <small className="text-muted">Annual: {premium ? `${(parseFloat(premium) * 12).toFixed(4)} ETH` : ''}</small>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3">
              <div className="progress" style={{ height: '20px' }}>
                <div
                  className={`progress-bar bg-${getRiskLevel(riskScore).color}`}
                  role="progressbar"
                  style={{ width: `${riskScore}%` }}
                  aria-valuenow={riskScore}
                  aria-valuemin="0"
                  aria-valuemax="100"
                >
                  {riskScore}%
                </div>
              </div>
            </div>

            {/* Payment Section */}
            {showPayment && !policyCreated && (
              <div className="mt-4">
                <div className="alert alert-warning">
                  <h5 className="alert-heading">
                    <i className="fas fa-credit-card me-2"></i>
                    Payment Required
                  </h5>
                  <p>To create your policy, you need to pay the premium amount.</p>
                  
                  {/* Token Information */}
                  {tokenInfo && (
                    <div className="mb-3 p-3 bg-light rounded">
                      <h6><i className="fas fa-coins me-2"></i>Token Information</h6>
                      <div className="row">
                        <div className="col-md-6">
                          <p><strong>Token Address:</strong> <code>{tokenInfo.address.substring(0, 10)}...</code></p>
                          <p><strong>Your Balance:</strong> 
                            <span className={parseFloat(tokenInfo.balance) >= parseFloat(premium) ? 'text-success' : 'text-danger'}>
                              {parseFloat(tokenInfo.balance).toFixed(6)} tokens
                            </span>
                          </p>
                        </div>
                        <div className="col-md-6">
                          <p><strong>Current Allowance:</strong> 
                            <span className={parseFloat(tokenInfo.allowance) >= parseFloat(premium) ? 'text-success' : 'text-warning'}>
                              {parseFloat(tokenInfo.allowance).toFixed(6)} tokens
                            </span>
                          </p>
                          <p><strong>Required Amount:</strong> {parseFloat(premium).toFixed(6)} tokens</p>
                        </div>
                      </div>
                      {parseFloat(tokenInfo.balance) < parseFloat(premium) && (
                        <div className="alert alert-danger mt-2">
                          <i className="fas fa-exclamation-triangle me-2"></i>
                          Insufficient token balance! You need more tokens to create this policy.
                        </div>
                      )}
                    </div>
                  )}

                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <strong>Premium Amount: {parseFloat(premium).toFixed(6)} tokens</strong>
                      <br />
                      <small className="text-muted">Annual: {(parseFloat(premium) * 12).toFixed(6)} tokens</small>
                    </div>
                    <div>
                      {approvalNeeded ? (
                        <button
                          className="btn btn-warning me-2"
                          onClick={handleApproveToken}
                          disabled={isApproving}
                        >
                          {isApproving ? (
                            <>
                              <i className="fas fa-spinner fa-spin me-2"></i>
                              Approving...
                            </>
                          ) : (
                            <>
                              <i className="fas fa-check-circle me-2"></i>
                              Approve Token
                            </>
                          )}
                        </button>
                      ) : (
                        <button
                          className="btn btn-success me-2"
                          onClick={handleCreatePolicy}
                          disabled={isCreatingPolicy}
                        >
                          {isCreatingPolicy ? (
                            <>
                              <i className="fas fa-spinner fa-spin me-2"></i>
                              Creating Policy...
                            </>
                          ) : (
                            <>
                              <i className="fas fa-credit-card me-2"></i>
                              Pay & Create Policy
                            </>
                          )}
                        </button>
                      )}
                      <button
                        className="btn btn-outline-secondary"
                        onClick={handleReset}
                      >
                        <i className="fas fa-arrow-left me-2"></i>
                        Back to Form
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Policy Created Success */}
            {policyCreated && (
              <div className="mt-4">
                <div className="alert alert-success">
                  <h5 className="alert-heading">
                    <i className="fas fa-check-circle me-2"></i>
                    Policy Created Successfully!
                  </h5>
                  <p>Your health insurance policy has been created and is now active.</p>
                  <div className="row">
                    <div className="col-md-6">
                      <p><strong>Policy ID:</strong> {policyId}</p>
                      <p><strong>Risk Score:</strong> {riskScore}</p>
                      <p><strong>Premium:</strong> {parseFloat(premium).toFixed(4)} ETH/month</p>
                    </div>
                    <div className="col-md-6">
                      <p><strong>Coverage Amount:</strong> {(parseFloat(premium) * 100).toFixed(4)} ETH</p>
                      <p><strong>Duration:</strong> 1 Year</p>
                      <p><strong>Status:</strong> <span className="badge bg-success">Active</span></p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <button
                      className="btn btn-primary me-2"
                      onClick={() => {
                        if (typeof onViewPolicy === 'function') {
                          onViewPolicy();
                        } else {
                          window.location.reload();
                        }
                      }}
                    >
                      <i className="fas fa-eye me-2"></i>
                      View My Policy
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RiskAnalysis;
