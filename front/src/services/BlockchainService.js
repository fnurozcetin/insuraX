import { ethers } from 'ethers';
import { HealthPolicyAddress, HealthPolicyABI } from '../config';

// Network configuration via environment (supports MetaMask Developer/Infura RPC keys)
const RPC_URL = process.env.REACT_APP_RPC_URL || 'https://sepolia.base.org';
const READ_RPC_URL = process.env.REACT_APP_READ_RPC_URL || RPC_URL;
const CHAIN_ID_HEX = process.env.REACT_APP_CHAIN_ID_HEX || '0x14A34'; // Base Sepolia by default
const CHAIN_NAME = process.env.REACT_APP_CHAIN_NAME || 'Base Sepolia';
const BLOCK_EXPLORER = process.env.REACT_APP_BLOCK_EXPLORER || 'https://sepolia.basescan.org/';
const NATIVE_CURRENCY_NAME = process.env.REACT_APP_NATIVE_CURRENCY_NAME || 'ETH';
const NATIVE_CURRENCY_SYMBOL = process.env.REACT_APP_NATIVE_CURRENCY_SYMBOL || 'ETH';
const NATIVE_CURRENCY_DECIMALS = Number(process.env.REACT_APP_NATIVE_CURRENCY_DECIMALS || 18);

class BlockchainService {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.contract = null;
    this.readProvider = null;
    this.readContract = null;
    this.contractAddress = HealthPolicyAddress;
    this.contractABI = HealthPolicyABI;
    this.isInitialized = false;
  }

  // IPFS helpers (via backend)
  async uploadPdfToIpfs(file) {
    try {
      if (!(file instanceof File)) {
        throw new Error('A File object is required');
      }
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('https://mainnet.infura.io/v3/34118375b1134ccb9ef7767b9621f25c', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to upload to IPFS');
      }
      const data = await res.json();
      return {
        success: true,
        cid: data?.data?.cid || data?.data?.path || data?.cid || data?.path,
        data,
      };
    } catch (error) {
      console.error('uploadPdfToIpfs failed:', error);
      return { success: false, error: error.message };
    }
  }

  async uploadBase64ToIpfs(base64) {
    try {
      if (!base64) throw new Error('base64 is required');
      const res = await fetch('http://localhost:3001/ipfs/upload-base64', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64, mimeType: 'application/pdf' }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to upload base64 to IPFS');
      }
      const data = await res.json();
      return {
        success: true,
        cid: data?.data?.cid || data?.data?.path || data?.cid || data?.path,
        data,
      };
    } catch (error) {
      console.error('uploadBase64ToIpfs failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Initialize blockchain connection
  async initialize(contractAddress = null, rpcUrl = RPC_URL) {
    try {
      if (contractAddress) {
        this.contractAddress = contractAddress;
      }

      // Check if MetaMask is available
      if (window.ethereum) {
        // Request account access
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        // Ensure MetaMask is on the configured chain
        if (CHAIN_ID_HEX) {
          try {
            await window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: CHAIN_ID_HEX }]
            });
          } catch (switchError) {
            // If the chain is not added, add it
            if (switchError && (switchError.code === 4902 || switchError.code === -32603)) {
              try {
                await window.ethereum.request({
                  method: 'wallet_addEthereumChain',
                  params: [{
                    chainId: CHAIN_ID_HEX,
                    chainName: CHAIN_NAME,
                    rpcUrls: [RPC_URL],
                    blockExplorerUrls: [BLOCK_EXPLORER],
                    nativeCurrency: { name: NATIVE_CURRENCY_NAME, symbol: NATIVE_CURRENCY_SYMBOL, decimals: NATIVE_CURRENCY_DECIMALS }
                  }]
                });
              } catch (_) {}
            }
          }
        }
        this.provider = new ethers.BrowserProvider(window.ethereum);
        this.signer = await this.provider.getSigner();
      } else {
        // Fallback to RPC provider
        this.provider = new ethers.JsonRpcProvider(rpcUrl);
      }

      // Always create a separate read-only provider for logs and broad queries
      this.readProvider = new ethers.JsonRpcProvider(READ_RPC_URL);

      // Initialize contract
      if (this.contractAddress) {
        this.contract = new ethers.Contract(
          this.contractAddress,
          this.contractABI,
          this.signer || this.provider
        );
        // Read-only contract bound to readProvider
        this.readContract = new ethers.Contract(
          this.contractAddress,
          this.contractABI,
          this.readProvider
        );
      }

      this.isInitialized = true;
      return { success: true, message: 'Blockchain service initialized successfully' };
    } catch (error) {
      console.error('Blockchain initialization failed:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to initialize blockchain service'
      };
    }
  }

  // Check if wallet is connected
  async connectWallet() {
    try {
      if (!window.ethereum) {
        throw new Error('MetaMask is not installed');
      }

      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const provider = new ethers.BrowserProvider(window.ethereum);
      this.signer = await provider.getSigner();
      
      if (this.contractAddress) {
        this.contract = new ethers.Contract(
          this.contractAddress,
          this.contractABI,
          this.signer
        );
      }

      return {
        success: true,
        address: accounts[0],
        message: 'Wallet connected successfully'
      };
    } catch (error) {
      console.error('Wallet connection failed:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to connect wallet'
      };
    }
  }

  // Get current account
  async getCurrentAccount() {
    try {
      if (this.signer) {
        const address = await this.signer.getAddress();
        return {
          success: true,
          address,
          message: 'Account retrieved successfully'
        };
      }
      return {
        success: false,
        message: 'No signer available'
      };
    } catch (error) {
      console.error('Failed to get current account:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to get current account'
      };
    }
  }

  // Get network info
  async getNetworkInfo() {
    try {
      if (this.provider) {
        const network = await this.provider.getNetwork();
        const blockNumber = await this.provider.getBlockNumber();
        return {
          success: true,
          data: {
            name: network.name,
            chainId: network.chainId.toString(),
            blockNumber,
            isConnected: true
          },
          message: 'Network info retrieved successfully'
        };
      }
      return {
        success: false,
        data: { isConnected: false },
        message: 'Provider not available'
      };
    } catch (error) {
      console.error('Failed to get network info:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to get network info'
      };
    }
  }

  // Policy Management Functions
  async createPolicy(policyHolder, riskScore, durationInDays, ipfsHash = null) {
    try {
      if (!this.contract) throw new Error('Contract not initialized');
      
      let tx;
      // Try 3-arg variant first if available
      try {
        // Detect function by signature
        this.contract.interface.getFunction('createPolicy(address,uint256,uint256)');
        tx = await this.contract['createPolicy(address,uint256,uint256)'](
          policyHolder,
          riskScore,
          durationInDays
        );
      } catch (_) {
        // Fallback to 4-arg variant (with ipfsHash). Use empty string if null.
        const ipfs = ipfsHash ?? '';
        tx = await this.contract.createPolicy(
          policyHolder,
          riskScore,
          durationInDays,
          ipfs
        );
      }

      const receipt = await tx.wait();
      
      // Robustly parse logs to find PolicyCreated
      let policyId;
      let eventArgs = null;
      for (const log of receipt.logs) {
        try {
          const parsed = this.contract.interface.parseLog(log);
          if (parsed && parsed.name === 'PolicyCreated') {
            eventArgs = parsed.args;
            const pid = parsed.args?.policyId ?? parsed.args?.[0];
            if (pid !== undefined) {
              policyId = Number(pid);
              break;
            }
          }
        } catch (_) {
          // Not our event, continue
        }
      }

      // Try to read back the created policy for logging
      let createdPolicy = null;
      try {
        if (policyId !== undefined) {
          const policyRes = await this.getPolicy(policyId);
          if (policyRes.success) {
            createdPolicy = policyRes.data;
          }
        }
      } catch (_) {}

      console.log('Policy creation result:', {
        txHash: tx.hash,
        policyId,
        eventArgs,
        createdPolicy
      });

      // Cache policy ID locally for resilient retrieval
      try {
        const network = await this.provider.getNetwork();
        const chainId = network.chainId?.toString?.() || 'unknown';
        if (policyHolder && policyId !== undefined) {
          this._cachePolicyId(policyHolder, policyId, chainId);
        }
      } catch (_) {}

      return {
        success: true,
        data: {
          policyId,
          txHash: tx.hash
        },
        message: 'Policy created successfully'
      };
    } catch (error) {
      console.error('Failed to create policy:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to create policy'
      };
    }
  }

  async getPolicy(policyId) {
    try {
      if (!this.contract) throw new Error('Contract not initialized');
      
      const readTarget = this.readContract || this.contract;
      const policy = await readTarget.getPolicy(policyId);
      
      return {
        success: true,
        data: {
          id: Number(policy.id),
          policyHolder: policy.policyHolder,
          premium: ethers.formatEther(policy.premium),
          coverageAmount: ethers.formatEther(policy.coverageAmount),
          startDate: new Date(Number(policy.startDate) * 1000),
          endDate: new Date(Number(policy.endDate) * 1000),
          isActive: policy.isActive,
          riskScore: Number(policy.riskScore),
          ipfsHash: policy.ipfsHash,
          rights: {
            examinationRights: Number(policy.rights.examinationRights),
            laboratoryRights: Number(policy.rights.laboratoryRights),
            radiologyRights: Number(policy.rights.radiologyRights),
            outpatientRights: Number(policy.rights.outpatientRights),
            advancedDiagnosisRights: Number(policy.rights.advancedDiagnosisRights),
            physiotherapyRights: Number(policy.rights.physiotherapyRights),
            examinationLimit: ethers.formatEther(policy.rights.examinationLimit),
            laboratoryLimit: ethers.formatEther(policy.rights.laboratoryLimit),
            radiologyLimit: ethers.formatEther(policy.rights.radiologyLimit),
            outpatientLimit: ethers.formatEther(policy.rights.outpatientLimit),
            advancedDiagnosisLimit: ethers.formatEther(policy.rights.advancedDiagnosisLimit),
            physiotherapyLimit: ethers.formatEther(policy.rights.physiotherapyLimit),
          }
        },
        message: 'Policy retrieved successfully'
      };
    } catch (error) {
      console.error('Failed to get policy:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to get policy'
      };
    }
  }

  async getUserPolicies(userAddress) {
    try {
      if (!this.contract) throw new Error('Contract not initialized');
      
      // 1) Use cached ids first if available
      const cachedFirst = this._getCachedPolicyIds(userAddress);
      if (cachedFirst.length > 0) {
        return { success: true, data: cachedFirst, message: 'User policies loaded from cache' };
      }

      // 2) Try direct contract getter
      try {
        const readTarget = this.readContract || this.contract;
        const policyIds = await readTarget.getUserPolicies(userAddress);
        return {
          success: true,
          data: policyIds.map(id => Number(id)),
          message: 'User policies retrieved successfully'
        };
      } catch (primaryError) {
        // 3) Fallback: try scanning a reasonable range using getPolicy if available
        try {
          let latest = 0;
          try {
            latest = Number(await this.contract.policyCounter());
          } catch (_) {
            latest = 0; // unknown
          }
          const MAX_SCAN = 100;
          const from = latest > 0 ? Math.max(1, latest - MAX_SCAN) : 1;
          const to = latest > 0 ? latest : from - 1; // if unknown, skip scan
          const ids = [];
          for (let id = to; id >= from; id -= 1) {
            const p = await this.getPolicy(id);
            if (p.success && p.data?.policyHolder?.toLowerCase?.() === userAddress.toLowerCase()) {
              ids.push(id);
            }
          }
          if (ids.length > 0) {
            return { success: true, data: ids, message: 'User policies derived by scanning' };
          }
        } catch (_) {}

        // 4) Final fallback: attempt logs via read provider, but swallow RPC errors
        try {
          const contractForLogs = this.readContract || this.contract;
          const filter = contractForLogs.filters.PolicyCreated(null, userAddress);
          const logs = await contractForLogs.queryFilter(filter, 0n, 'latest');
          const ids = Array.from(new Set(logs
            .map(log => {
              try {
                const pid = log.args?.policyId ?? log.args?.[0];
                return pid !== undefined ? Number(pid) : undefined;
              } catch (_) {
                return undefined;
              }
            })
            .filter(id => id !== undefined)));
          if (ids.length > 0) {
            return { success: true, data: ids, message: 'User policies derived from events' };
          }
        } catch (_) {}

        // 5) Nothing worked; return cache (may be empty) without throwing
        const cached = this._getCachedPolicyIds(userAddress);
        return { success: true, data: cached, message: 'User policies loaded from cache (RPC unavailable)' };
      }
    } catch (error) {
      console.error('Failed to get user policies:', error);
      return {
        success: true,
        data: this._getCachedPolicyIds(userAddress),
        message: 'User policies loaded from cache (error)'
      };
    }
  }

  // Local cache helpers
  _getCachedPolicyIds(userAddress) {
    try {
      if (!userAddress) return [];
      const cachedKeys = Object.keys(localStorage).filter(k => k.startsWith('PC_policies_'));
      const all = new Set();
      for (const key of cachedKeys) {
        const arr = JSON.parse(localStorage.getItem(key) || '[]');
        for (const id of arr) all.add(Number(id));
      }
      return Array.from(all);
    } catch (_) {
      return [];
    }
  }

  _cachePolicyId(userAddress, policyId, chainId = 'unknown') {
    try {
      if (!userAddress || policyId === undefined) return;
      const key = `PC_policies_${chainId}_${userAddress.toLowerCase()}`;
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      if (!existing.includes(policyId)) {
        existing.push(policyId);
        localStorage.setItem(key, JSON.stringify(existing));
      }
    } catch (_) {}
  }

  async getUserPoliciesWithDetails(userAddress) {
    try {
      if (!this.contract) throw new Error('Contract not initialized');

      const idsResult = await this.getUserPolicies(userAddress);
      if (!idsResult.success) {
        return idsResult;
      }

      const details = [];
      for (const id of idsResult.data) {
        const policyResult = await this.getPolicy(Number(id));
        if (policyResult.success) {
          details.push(policyResult.data);
        }
      }

      return {
        success: true,
        data: details,
        message: 'User policies with details retrieved successfully'
      };
    } catch (error) {
      console.error('Failed to get user policies with details:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to get user policies with details'
      };
    }
  }

  async pausePolicy(policyId) {
    try {
      if (!this.contract) throw new Error('Contract not initialized');
      
      const tx = await this.contract.pausePolicy(policyId);
      await tx.wait();

      return {
        success: true,
        txHash: tx.hash,
        message: 'Policy paused successfully'
      };
    } catch (error) {
      console.error('Failed to pause policy:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to pause policy'
      };
    }
  }

  async unpausePolicy(policyId) {
    try {
      if (!this.contract) throw new Error('Contract not initialized');
      
      const tx = await this.contract.unpausePolicy(policyId);
      await tx.wait();

      return {
        success: true,
        txHash: tx.hash,
        message: 'Policy unpaused successfully'
      };
    } catch (error) {
      console.error('Failed to unpause policy:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to unpause policy'
      };
    }
  }

  // Service Request Management
  async requestService(policyId, patient, doctor, icdCode, sutCode, amount) {
    try {
      if (!this.contract) throw new Error('Contract not initialized');
      
      const tx = await this.contract.requestService(
        policyId,
        patient,
        doctor,
        icdCode,
        sutCode,
        ethers.parseEther(amount.toString())
      );

      const receipt = await tx.wait();
      
      // Find the ServiceRequested event
      const event = receipt.logs.find(log => 
        log.fragment && log.fragment.name === 'ServiceRequested'
      );
      
      let requestId;
      if (event) {
        requestId = Number(event.args.requestId);
      } else {
        // Fallback: get the latest request ID from the contract
        requestId = Number(await this.contract.serviceRequestCounter()) - 1;
      }

      return {
        success: true,
        data: {
          requestId,
          txHash: tx.hash
        },
        message: 'Service requested successfully'
      };
    } catch (error) {
      console.error('Failed to request service:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to request service'
      };
    }
  }

  async getServiceRequest(requestId) {
    try {
      if (!this.contract) throw new Error('Contract not initialized');
      
      const request = await this.contract.getServiceRequest(requestId);
      
      return {
        success: true,
        data: {
          id: Number(request.id),
          policyId: Number(request.policyId),
          patient: request.patient,
          hospital: request.hospital,
          doctor: request.doctor,
          icdCode: request.icdCode,
          sutCode: request.sutCode,
          amount: ethers.formatEther(request.amount),
          paymentStatus: Number(request.paymentStatus),
          requestDate: new Date(Number(request.requestDate) * 1000),
          processDate: request.processDate ? new Date(Number(request.processDate) * 1000) : null,
          ipfsHash: request.ipfsHash,
          isProcessed: request.isProcessed
        },
        message: 'Service request retrieved successfully'
      };
    } catch (error) {
      console.error('Failed to get service request:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to get service request'
      };
    }
  }

  async processServiceRequest(requestId, ipfsHash) {
    try {
      if (!this.contract) throw new Error('Contract not initialized');
      
      const tx = await this.contract.processServiceRequest(requestId, ipfsHash);
      await tx.wait();

      return {
        success: true,
        txHash: tx.hash,
        message: 'Service request processed successfully'
      };
    } catch (error) {
      console.error('Failed to process service request:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to process service request'
      };
    }
  }

  async payForService(requestId) {
    try {
      if (!this.contract) throw new Error('Contract not initialized');
      
      const tx = await this.contract.payForService(requestId);
      await tx.wait();

      return {
        success: true,
        txHash: tx.hash,
        message: 'Payment for service completed successfully'
      };
    } catch (error) {
      console.error('Failed to pay for service:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to pay for service'
      };
    }
  }

  // Medical Code Management
  async addICDCode(code, description, requiresSUT, isPreExisting, coveragePercentage) {
    try {
      if (!this.contract) throw new Error('Contract not initialized');
      
      const tx = await this.contract.addICDCode(
        code,
        description,
        requiresSUT,
        isPreExisting,
        coveragePercentage
      );
      await tx.wait();

      return {
        success: true,
        txHash: tx.hash,
        message: 'ICD code added successfully'
      };
    } catch (error) {
      console.error('Failed to add ICD code:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to add ICD code'
      };
    }
  }

  async getICDCode(code) {
    try {
      if (!this.contract) throw new Error('Contract not initialized');
      
      const icdCode = await this.contract.getICDCode(code);
      
      return {
        success: true,
        data: {
          code: icdCode.code,
          description: icdCode.description,
          requiresSUT: icdCode.requiresSUT,
          isPreExisting: icdCode.isPreExisting,
          coveragePercentage: Number(icdCode.coveragePercentage)
        },
        message: 'ICD code retrieved successfully'
      };
    } catch (error) {
      console.error('Failed to get ICD code:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to get ICD code'
      };
    }
  }

  async addSUTCode(code, description, serviceType, basePrice) {
    try {
      if (!this.contract) throw new Error('Contract not initialized');
      
      const tx = await this.contract.addSUTCode(
        code,
        description,
        serviceType,
        basePrice
      );
      await tx.wait();

      return {
        success: true,
        txHash: tx.hash,
        message: 'SUT code added successfully'
      };
    } catch (error) {
      console.error('Failed to add SUT code:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to add SUT code'
      };
    }
  }

  async getSUTCode(code) {
    try {
      if (!this.contract) throw new Error('Contract not initialized');
      
      const sutCode = await this.contract.getSUTCode(code);
      
      return {
        success: true,
        data: {
          code: sutCode.code,
          description: sutCode.description,
          serviceType: Number(sutCode.serviceType),
          basePrice: ethers.formatEther(sutCode.basePrice),
          isActive: sutCode.isActive
        },
        message: 'SUT code retrieved successfully'
      };
    } catch (error) {
      console.error('Failed to get SUT code:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to get SUT code'
      };
    }
  }

  // Hospital and Doctor Management
  async setHospitalApproval(hospital, isApproved) {
    try {
      if (!this.contract) throw new Error('Contract not initialized');
      
      const tx = await this.contract.setHospitalApproval(hospital, isApproved);
      await tx.wait();

      return {
        success: true,
        txHash: tx.hash,
        message: `Hospital ${isApproved ? 'approved' : 'disapproved'} successfully`
      };
    } catch (error) {
      console.error('Failed to set hospital approval:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to set hospital approval'
      };
    }
  }

  async setDoctorApproval(doctor, isApproved) {
    try {
      if (!this.contract) throw new Error('Contract not initialized');
      
      const tx = await this.contract.setDoctorApproval(doctor, isApproved);
      await tx.wait();

      return {
        success: true,
        txHash: tx.hash,
        message: `Doctor ${isApproved ? 'approved' : 'disapproved'} successfully`
      };
    } catch (error) {
      console.error('Failed to set doctor approval:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to set doctor approval'
      };
    }
  }

  async addHospitalService(sutCode, price) {
    try {
      if (!this.contract) throw new Error('Contract not initialized');
      
      const tx = await this.contract.addHospitalService(sutCode, price);
      await tx.wait();

      return {
        success: true,
        txHash: tx.hash,
        message: 'Hospital service added successfully'
      };
    } catch (error) {
      console.error('Failed to add hospital service:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to add hospital service'
      };
    }
  }

  async updateHospitalServicePrice(sutCode, newPrice) {
    try {
      if (!this.contract) throw new Error('Contract not initialized');
      
      const tx = await this.contract.updateHospitalServicePrice(sutCode, newPrice);
      await tx.wait();

      return {
        success: true,
        txHash: tx.hash,
        message: 'Hospital service price updated successfully'
      };
    } catch (error) {
      console.error('Failed to update hospital service price:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to update hospital service price'
      };
    }
  }

  async getHospitalService(hospital, sutCode) {
    try {
      if (!this.contract) throw new Error('Contract not initialized');
      
      const service = await this.contract.getHospitalService(hospital, sutCode);
      
      return {
        success: true,
        data: {
          hospital: service.hospital,
          sutCode: service.sutCode,
          price: ethers.formatEther(service.price),
          isActive: service.isActive,
          lastUpdated: new Date(Number(service.lastUpdated) * 1000)
        },
        message: 'Hospital service retrieved successfully'
      };
    } catch (error) {
      console.error('Failed to get hospital service:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to get hospital service'
      };
    }
  }

  // Patient Management
  async addPreExistingCondition(patient, icdCode, diagnosisDate) {
    try {
      if (!this.contract) throw new Error('Contract not initialized');
      
      const tx = await this.contract.addPreExistingCondition(
        patient,
        icdCode,
        diagnosisDate
      );
      await tx.wait();

      return {
        success: true,
        txHash: tx.hash,
        message: 'Pre-existing condition added successfully'
      };
    } catch (error) {
      console.error('Failed to add pre-existing condition:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to add pre-existing condition'
      };
    }
  }

  async getPatientRights(patient) {
    try {
      if (!this.contract) throw new Error('Contract not initialized');
      
      try {
        const [rights, usedAmounts, limits] = await this.contract.getPatientRights(patient);
        const rightsArr = rights.map(r => Number(r));
        const usedArr = usedAmounts.map(u => ethers.formatEther(u));
        const limitsArr = limits.map(l => ethers.formatEther(l));
        return {
          success: true,
          data: {
            rights: rightsArr,
            usedAmounts: usedArr,
            limits: limitsArr,
            // Convenience fields for EXAMINATION (index 1)
            remainingRights: rightsArr[1] ?? 0,
            usedAmount: usedArr[1] ?? '0'
          },
          message: 'Patient rights retrieved successfully'
        };
      } catch (primaryError) {
        // Fallback: read per-service mappings and limits from active policy
        const serviceTypeCount = 6;
        const rightsArr = [];
        const usedArr = [];
        for (let i = 0; i < serviceTypeCount; i += 1) {
          try {
            const r = await this.contract.patientRights(patient, i);
            rightsArr.push(Number(r));
          } catch (e) {
            rightsArr.push(0);
          }
          try {
            const u = await this.contract.patientUsedAmounts(patient, i);
            usedArr.push(ethers.formatEther(u));
          } catch (e) {
            usedArr.push('0');
          }
        }

        // Fetch limits from user's active policy (if any)
        let limitsArr = Array(serviceTypeCount).fill('0');
        try {
          const policies = await this.getUserPolicies(patient);
          if (policies.success && policies.data.length > 0) {
            // Try to find active policy
            let policyData = null;
            for (const id of policies.data) {
              const p = await this.getPolicy(Number(id));
              if (p.success) {
                policyData = p.data;
                if (p.data.isActive) break;
              }
            }
            if (policyData && policyData.rights) {
              // Order must match: OUTPATIENT, EXAMINATION, LABORATORY, RADIOLOGY, ADVANCED_DIAGNOSIS, PHYSIOTHERAPY
              limitsArr = [
                policyData.rights.outpatientLimit,
                policyData.rights.examinationLimit,
                policyData.rights.laboratoryLimit,
                policyData.rights.radiologyLimit,
                policyData.rights.advancedDiagnosisLimit,
                policyData.rights.physiotherapyLimit
              ].map(v => v?.toString?.() ?? String(v));
            }
          }
        } catch (e) {
          // ignore, keep zeros
        }

        return {
          success: true,
          data: {
            rights: rightsArr,
            usedAmounts: usedArr,
            limits: limitsArr,
            remainingRights: rightsArr[1] ?? 0,
            usedAmount: usedArr[1] ?? '0'
          },
          message: 'Patient rights retrieved via fallback'
        };
      }
    } catch (error) {
      console.error('Failed to get patient rights:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to get patient rights'
      };
    }
  }

  async getPatientRightsDetailed(patient) {
    try {
      if (!this.contract) throw new Error('Contract not initialized');
      
      const [serviceTypes, remainingRights, usedAmounts, limits] = await this.contract.getPatientRightsDetailed(patient);
      
      return {
        success: true,
        data: {
          serviceTypes: serviceTypes,
          remainingRights: remainingRights.map(r => Number(r)),
          usedAmounts: usedAmounts.map(u => ethers.formatEther(u)),
          limits: limits.map(l => ethers.formatEther(l))
        },
        message: 'Detailed patient rights retrieved successfully'
      };
    } catch (error) {
      console.error('Failed to get detailed patient rights:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to get detailed patient rights'
      };
    }
  }

  async getPatientServiceRequests(patient) {
    try {
      if (!this.contract) throw new Error('Contract not initialized');
      
      try {
        const requestIds = await this.contract.getPatientServiceRequests(patient);
        const requests = [];
        for (const requestId of requestIds) {
          const request = await this.getServiceRequest(Number(requestId));
          if (request.success) {
            requests.push(request.data);
          }
        }
        return {
          success: true,
          data: requests,
          message: 'Patient service requests retrieved successfully'
        };
      } catch (primaryError) {
        // Fallback: scan recent requests and filter by patient
        let counter = 0;
        try {
          counter = Number(await this.contract.serviceRequestCounter());
        } catch (e) {
          counter = 0;
        }
        const MAX_SCAN = 100;
        const requests = [];
        for (let id = counter; id > 0 && (counter - id) < MAX_SCAN; id -= 1) {
          const req = await this.getServiceRequest(id);
          if (req.success && req.data.patient?.toLowerCase?.() === patient.toLowerCase()) {
            requests.push(req.data);
          }
        }
        return {
          success: true,
          data: requests,
          message: 'Patient service requests retrieved via fallback'
        };
      }
    } catch (error) {
      console.error('Failed to get patient service requests:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to get patient service requests'
      };
    }
  }

  // Utility Functions
  async calculatePremium(riskScore) {
    try {
      console.log('Calculating premium for risk score:', riskScore);
      
      if (!this.contract) {
        throw new Error('Contract not initialized. Make sure to call initialize() first.');
      }
      
      // Ensure riskScore is a number and within valid range
      const score = Number(riskScore);
      if (isNaN(score) || score < 1 || score > 100) {
        throw new Error('Risk score must be a number between 1 and 100');
      }

      let premium;
      if (score <= 20) {
        premium = ethers.parseEther('0.001'); // for low risk
      } else if (score <= 50) {
        premium = ethers.parseEther('0.0025'); // for medium risk
      } else if (score <= 80) {
        premium = ethers.parseEther('0.004'); // for high risk
      } else {
        premium = ethers.parseEther('0.007'); // for very high risk
      }
      
      console.log('Premium calculated locally:', ethers.formatEther(premium));
      
      return {
        success: true,
        data: {
          premium: ethers.formatEther(premium.toString()),
          riskScore: score
        },
        message: 'Premium calculated successfully (local calculation)'
      };
      
    } catch (error) {
      console.error('Failed to calculate premium:', {
        error: error.message,
        stack: error.stack,
        contractAddress: this.contractAddress,
        riskScore: riskScore
      });
      
      return {
        success: false,
        error: error.message,
        message: `Failed to calculate premium: ${error.message}`,
        details: {
          contractAddress: this.contractAddress,
          riskScore: riskScore,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  async isServiceCoveredView(patient, serviceType, amount) {
    try {
      if (!this.contract) throw new Error('Contract not initialized');
      
      const isCovered = await this.contract.isServiceCoveredView(
        patient,
        serviceType,
        ethers.parseEther(amount.toString())
      );
      
      return {
        success: true,
        data: isCovered,
        message: 'Service coverage checked successfully'
      };
    } catch (error) {
      console.error('Failed to check service coverage:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to check service coverage'
      };
    }
  }

  async getPaymentTokenAddress() {
    try {
      if (!this.contract) throw new Error('Contract not initialized');
      const tokenAddress = '0x170Bce484Ef20B3Ef4226cbf56E7F4bae1Cff448';
      return {
        success: true,
        data: tokenAddress,
        message: 'Payment token address retrieved successfully'
      };
    } catch (error) {
      console.error('Failed to get payment token address:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to get payment token address'
      };
    }
  }

  // Token Management
  async getTokenBalance(tokenAddress, userAddress) {
    try {
      if (!this.provider) throw new Error('Provider not initialized');
      if (!tokenAddress) throw new Error('Token address is required');
      if (!userAddress) throw new Error('User address is required');
      
      // Standard ERC20 ABI with required functions
      const erc20Abi = [
        'function balanceOf(address owner) view returns (uint256)',
        'function allowance(address owner, address spender) view returns (uint256)',
        'function decimals() view returns (uint8)'
      ];
      
      const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, this.provider);
      
      // Get token balance and decimals
      const balance = await tokenContract.balanceOf(userAddress);
      const decimals = await tokenContract.decimals();
      let allowance = '0';
      
      // Only check allowance if contract address is available
      if (this.contractAddress) {
        allowance = await tokenContract.allowance(userAddress, this.contractAddress);
      }
      
      return {
        success: true,
        data: {
          balance: ethers.formatUnits(balance, decimals),
          allowance: ethers.formatUnits(allowance, decimals),
          decimals: Number(decimals)
        },
        message: 'Token balance retrieved successfully'
      };
    } catch (error) {
      console.error('Failed to get token balance:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to get token balance'
      };
    }
  }

  async approveToken(tokenAddress, amount) {
    try {
      if (!this.signer) throw new Error('Signer not initialized');
      
      const tokenContract = new ethers.Contract(
        tokenAddress,
        [
          "function approve(address spender, uint256 amount) returns (bool)",
          "function decimals() view returns (uint8)"
        ],
        this.signer
      );

      const decimals = await tokenContract.decimals();
      const amountWei = ethers.parseUnits(amount.toString(), decimals);
      
      const tx = await tokenContract.approve(this.contractAddress, amountWei);
      await tx.wait();
      
      return {
        success: true,
        txHash: tx.hash,
        message: 'Token approval completed successfully'
      };
    } catch (error) {
      console.error('Failed to approve token:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to approve token'
      };
    }
  }

  // Emergency Functions
  async emergencyWithdraw() {
    try {
      if (!this.contract) throw new Error('Contract not initialized');
      
      const tx = await this.contract.emergencyWithdraw();
      await tx.wait();

      return {
        success: true,
        txHash: tx.hash,
        message: 'Emergency withdrawal completed successfully'
      };
    } catch (error) {
      console.error('Failed to execute emergency withdrawal:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to execute emergency withdrawal'
      };
    }
  }

  // Ownership Functions
  async transferOwnership(newOwner) {
    try {
      if (!this.contract) throw new Error('Contract not initialized');
      
      const tx = await this.contract.transferOwnership(newOwner);
      await tx.wait();

      return {
        success: true,
        txHash: tx.hash,
        message: 'Ownership transferred successfully'
      };
    } catch (error) {
      console.error('Failed to transfer ownership:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to transfer ownership'
      };
    }
  }

  async renounceOwnership() {
    try {
      if (!this.contract) throw new Error('Contract not initialized');
      
      const tx = await this.contract.renounceOwnership();
      await tx.wait();

      return {
        success: true,
        txHash: tx.hash,
        message: 'Ownership renounced successfully'
      };
    } catch (error) {
      console.error('Failed to renounce ownership:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to renounce ownership'
      };
    }
  }

  async getOwner() {
    try {
      if (!this.contract) throw new Error('Contract not initialized');
      
      const owner = await this.contract.owner();
      
      return {
        success: true,
        data: owner,
        message: 'Contract owner retrieved successfully'
      };
    } catch (error) {
      console.error('Failed to get contract owner:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to get contract owner'
      };
    }
  }

  // Check if contract is ready
  isReady() {
    return this.isInitialized && !!(this.contract && this.provider);
  }

  // Get contract instance
  getContract() {
    return this.contract;
  }

  // Get provider
  getProvider() {
    return this.provider;
  }

  // Get signer
  getSigner() {
    return this.signer;
  }

  // Get contract address
  getContractAddress() {
    return this.contractAddress;
  }
}

// Create singleton instance
const blockchainService = new BlockchainService();
export default blockchainService;
// Expose for debugging in browser console
try { if (typeof window !== 'undefined') { window.blockchainService = blockchainService; } } catch (_) {}
