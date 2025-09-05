// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title HealthPolicy
 * @dev A smart contract for managing health insurance policies and claims.
 * Off-chain logic (NestJS) is responsible for:
 * - Calculating risk scores.
 * - Encrypting and uploading documents to IPFS.
 * - Managing detailed user, doctor, and hospital data.
 * This contract handles:
 * - Storing policy and claim records with IPFS hashes.
 * - Processing premium payments and claim payouts via an ERC20 token.
 * - Authorizing hospitals and doctors by their addresses.
 */
contract HealthPolicy is Ownable, ReentrancyGuard {
    // Structs
    struct Policy {
        uint256 id;
        address policyHolder; // The wallet address of the insured person
        uint256 premium; // Premium amount in token units
        uint256 coverageAmount; // Maximum claimable amount
        uint256 startDate; // Policy start timestamp
        uint256 endDate; // Policy end timestamp
        bool isActive;
        uint256 riskScore; // Calculated off-chain, stored on-chain
        string ipfsHash; // IPFS CID for encrypted policy documents
    }

    struct Claim {
        uint256 id;
        uint256 policyId;
        address hospital; // Address of the hospital that submitted the claim
        uint256 amount; // Claimed amount
        string ipfsHash; // IPFS CID for encrypted medical reports/images
        bool isApproved; // Approved by the contract owner (admin)
        bool isPaid; // Paid out to the hospital
        uint256 timestamp; // Claim submission timestamp
    }

    struct HospitalService {
        uint256 id;
        address hospital; // Hospital wallet address
        string serviceName; // Service name (e.g., "Muayene", "MR", "Radyoloji")
        string serviceType; // Service type
        uint256 limit; // Total limit for this service
        uint256 remainingLimit; // Remaining limit
        uint256 price; // Price per service in token units
        bool isActive; // Whether the service is active
    }

    struct PatientServiceUsage {
        uint256 policyId;
        uint256 serviceId;
        address patient;
        address hospital;
        uint256 amount;
        uint256 timestamp;
        bool isPaid;
    }

    // State Variables
    uint256 public policyCounter;
    uint256 public claimCounter;
    uint256 public hospitalServiceCounter;
    uint256 public serviceUsageCounter;
    IERC20 public paymentToken; // The ERC20 token used for payments (e.g., USDT, DAI)

    // Mappings
    mapping(uint256 => Policy) public policies;
    mapping(uint256 => Claim) public claims;
    mapping(uint256 => HospitalService) public hospitalServices;
    mapping(uint256 => PatientServiceUsage) public serviceUsages;
    mapping(address => uint256[]) public userPolicies;
    mapping(address => bool) public approvedHospitals;
    mapping(address => bool) public approvedDoctors;
    mapping(address => uint256[]) public hospitalServiceIds; // Hospital address => service IDs
    mapping(uint256 => uint256[]) public policyServiceUsages; // Policy ID => usage IDs

    // Events
    event PolicyCreated(
        uint256 indexed policyId,
        address indexed policyHolder,
        uint256 premium,
        uint256 coverageAmount,
        uint256 riskScore
    );

    event ClaimSubmitted(
        uint256 indexed claimId,
        uint256 indexed policyId,
        address indexed hospital,
        uint256 amount,
        string ipfsHash
    );

    event ClaimApproved(uint256 indexed claimId, address indexed approver);
    event ClaimPaid(uint256 indexed claimId, address indexed hospital, uint256 amount);
    event HospitalStatusChanged(address indexed hospital, bool isApproved);
    event DoctorStatusChanged(address indexed doctor, bool isApproved);
    event HospitalServiceCreated(
        uint256 indexed serviceId,
        address indexed hospital,
        string serviceName,
        uint256 limit,
        uint256 price
    );
    event ServiceUsed(
        uint256 indexed usageId,
        uint256 indexed policyId,
        uint256 indexed serviceId,
        address patient,
        address hospital,
        uint256 amount
    );
    event ServicePaymentMade(uint256 indexed usageId, address indexed hospital, uint256 amount);

    // Modifiers
    modifier onlyApprovedHospital() {
        require(approvedHospitals[msg.sender], "Caller is not an approved hospital");
        _;
    }

    // Constructor
    constructor(address _paymentTokenAddress) {
        paymentToken = IERC20(_paymentTokenAddress);
    }

    // --- Policy Management ---

    /**
     * @dev Creates a new health policy. Called by the user.
     * The risk score is calculated by the backend.
     * The IPFS hash points to encrypted documents, prepared by the backend.
     * User must first approve the contract to spend `_premium` amount of their tokens.
     */
    function createPolicy(
        address _policyHolder,
        uint256 _premium,
        uint256 _coverageAmount,
        uint256 _durationInDays,
        uint256 _riskScore,
        string calldata _ipfsHash
    ) external nonReentrant returns (uint256) {
        require(_policyHolder != address(0), "Invalid policyholder address");
        require(_premium > 0, "Premium must be greater than 0");
        require(_coverageAmount > _premium, "Coverage must exceed premium");
        require(_durationInDays > 0, "Duration must be at least 1 day");
        require(_riskScore >= 1 && _riskScore <= 100, "Risk score out of range (1-100)");

        // Transfer premium from the user to this contract
        require(
            paymentToken.transferFrom(_policyHolder, address(this), _premium),
            "ERC20: Premium transfer failed"
        );

        uint256 policyId = ++policyCounter;
        uint256 startDate = block.timestamp;
        uint256 endDate = startDate + (_durationInDays * 1 days);

        policies[policyId] = Policy({
            id: policyId,
            policyHolder: _policyHolder,
            premium: _premium,
            coverageAmount: _coverageAmount,
            startDate: startDate,
            endDate: endDate,
            isActive: true,
            riskScore: _riskScore,
            ipfsHash: _ipfsHash
        });

        userPolicies[_policyHolder].push(policyId);

        emit PolicyCreated(policyId, _policyHolder, _premium, _coverageAmount, _riskScore);

        return policyId;
    }

    // --- Claim Management ---

    /**
     * @dev Submits a claim against a policy. Can only be called by an approved hospital.
     * The IPFS hash points to encrypted medical documents, prepared by the backend.
     */
    function submitClaim(
        uint256 _policyId,
        uint256 _amount,
        string calldata _ipfsHash
    ) external onlyApprovedHospital nonReentrant returns (uint256) {
        Policy storage policy = policies[_policyId];
        require(policy.isActive, "Policy is not active");
        require(block.timestamp <= policy.endDate, "Policy has expired");
        require(_amount > 0, "Claim amount must be positive");
        require(_amount <= policy.coverageAmount, "Claim amount exceeds coverage");

        uint256 claimId = ++claimCounter;

        claims[claimId] = Claim({
            id: claimId,
            policyId: _policyId,
            hospital: msg.sender,
            amount: _amount,
            ipfsHash: _ipfsHash,
            isApproved: false,
            isPaid: false,
            timestamp: block.timestamp
        });

        emit ClaimSubmitted(claimId, _policyId, msg.sender, _amount, _ipfsHash);

        return claimId;
    }

    /**
     * @dev Approves a submitted claim. Can only be called by the contract owner (admin).
     */
    function approveClaim(uint256 _claimId) external onlyOwner nonReentrant {
        Claim storage claim = claims[_claimId];
        require(claim.id != 0, "Claim does not exist");
        require(!claim.isApproved, "Claim already approved");
        require(!claim.isPaid, "Claim already paid");

        claim.isApproved = true;
        emit ClaimApproved(_claimId, msg.sender);
    }

    /**
     * @dev Pays an approved claim. Can only be called by the contract owner (admin).
     * Transfers the claimed amount from the contract to the hospital.
     */
    function payClaim(uint256 _claimId) external onlyOwner nonReentrant {
        Claim storage claim = claims[_claimId];
        Policy storage policy = policies[claim.policyId];

        require(claim.isApproved, "Claim is not approved");
        require(!claim.isPaid, "Claim has already been paid");
        require(policy.coverageAmount >= claim.amount, "Policy has insufficient coverage left");

        // Decrease policy coverage before external call
        policy.coverageAmount -= claim.amount;
        claim.isPaid = true;

        // Transfer payment to the hospital
        require(paymentToken.transfer(claim.hospital, claim.amount), "ERC20: Payment transfer failed");

        emit ClaimPaid(_claimId, claim.hospital, claim.amount);
    }

    // --- Admin Functions ---

    /**
     * @dev Approves or revokes approval for a hospital address.
     */
    function setHospitalApproval(address _hospital, bool _isApproved) external onlyOwner {
        require(_hospital != address(0), "Invalid address");
        approvedHospitals[_hospital] = _isApproved;
        emit HospitalStatusChanged(_hospital, _isApproved);
    }

    /**
     * @dev Approves or revokes approval for a doctor address.
     */
    function setDoctorApproval(address _doctor, bool _isApproved) external onlyOwner {
        require(_doctor != address(0), "Invalid address");
        approvedDoctors[_doctor] = _isApproved;
        emit DoctorStatusChanged(_doctor, _isApproved);
    }

    /**
     * @dev Allows the owner to withdraw contract balance. 
     * Useful for collecting profits or in case of emergency.
     */
    function withdrawFunds(uint256 _amount) external onlyOwner nonReentrant {
        require(_amount > 0, "Amount must be positive");
        uint256 balance = paymentToken.balanceOf(address(this));
        require(_amount <= balance, "Insufficient contract balance");

        require(paymentToken.transfer(owner(), _amount), "ERC20: Withdrawal failed");
    }

    // --- View Functions ---

    function getPolicy(uint256 _policyId) external view returns (Policy memory) {
        return policies[_policyId];
    }

    function getUserPolicies(address _user) external view returns (uint256[] memory) {
        return userPolicies[_user];
    }

    function getClaim(uint256 _claimId) external view returns (Claim memory) {
        return claims[_claimId];
    }

    // --- Hospital Service Management ---

    /**
     * @dev Creates a new hospital service. Can only be called by approved hospitals.
     */
    function createHospitalService(
        string calldata _serviceName,
        string calldata _serviceType,
        uint256 _limit,
        uint256 _price
    ) external onlyApprovedHospital nonReentrant returns (uint256) {
        require(_limit > 0, "Limit must be greater than 0");
        require(_price > 0, "Price must be greater than 0");
        require(bytes(_serviceName).length > 0, "Service name cannot be empty");

        uint256 serviceId = ++hospitalServiceCounter;

        hospitalServices[serviceId] = HospitalService({
            id: serviceId,
            hospital: msg.sender,
            serviceName: _serviceName,
            serviceType: _serviceType,
            limit: _limit,
            remainingLimit: _limit,
            price: _price,
            isActive: true
        });

        hospitalServiceIds[msg.sender].push(serviceId);

        emit HospitalServiceCreated(serviceId, msg.sender, _serviceName, _limit, _price);

        return serviceId;
    }

    /**
     * @dev Uses a hospital service by a patient. Can only be called by approved hospitals.
     * The patient must have an active policy and the service must have remaining limit.
     */
    function useHospitalService(
        uint256 _policyId,
        uint256 _serviceId,
        address _patient
    ) external onlyApprovedHospital nonReentrant returns (uint256) {
        Policy storage policy = policies[_policyId];
        HospitalService storage service = hospitalServices[_serviceId];

        require(policy.isActive, "Policy is not active");
        require(block.timestamp <= policy.endDate, "Policy has expired");
        require(policy.policyHolder == _patient, "Patient does not own this policy");
        require(service.isActive, "Service is not active");
        require(service.remainingLimit > 0, "Service limit exceeded");
        require(service.hospital == msg.sender, "Service does not belong to this hospital");
        require(policy.coverageAmount >= service.price, "Insufficient policy coverage");

        // Decrease remaining limit and policy coverage
        service.remainingLimit -= 1;
        policy.coverageAmount -= service.price;

        uint256 usageId = ++serviceUsageCounter;

        serviceUsages[usageId] = PatientServiceUsage({
            policyId: _policyId,
            serviceId: _serviceId,
            patient: _patient,
            hospital: msg.sender,
            amount: service.price,
            timestamp: block.timestamp,
            isPaid: false
        });

        policyServiceUsages[_policyId].push(usageId);

        emit ServiceUsed(usageId, _policyId, _serviceId, _patient, msg.sender, service.price);

        return usageId;
    }

    /**
     * @dev Pays for a service usage. Can only be called by the contract owner (admin).
     * Transfers the service amount from the contract to the hospital.
     */
    function payServiceUsage(uint256 _usageId) external onlyOwner nonReentrant {
        PatientServiceUsage storage usage = serviceUsages[_usageId];
        require(usage.policyId != 0, "Service usage does not exist");
        require(!usage.isPaid, "Service usage already paid");

        usage.isPaid = true;

        // Transfer payment to the hospital
        require(paymentToken.transfer(usage.hospital, usage.amount), "ERC20: Payment transfer failed");

        emit ServicePaymentMade(_usageId, usage.hospital, usage.amount);
    }

    /**
     * @dev Updates a hospital service. Can only be called by the service owner.
     */
    function updateHospitalService(
        uint256 _serviceId,
        string calldata _serviceName,
        string calldata _serviceType,
        uint256 _limit,
        uint256 _price,
        bool _isActive
    ) external nonReentrant {
        HospitalService storage service = hospitalServices[_serviceId];
        require(service.id != 0, "Service does not exist");
        require(service.hospital == msg.sender, "Only service owner can update");
        require(_limit >= service.limit - service.remainingLimit, "New limit cannot be less than used limit");

        service.serviceName = _serviceName;
        service.serviceType = _serviceType;
        service.limit = _limit;
        service.remainingLimit = _limit - (service.limit - service.remainingLimit);
        service.price = _price;
        service.isActive = _isActive;
    }

    // --- View Functions for Hospital Services ---

    function getHospitalService(uint256 _serviceId) external view returns (HospitalService memory) {
        return hospitalServices[_serviceId];
    }

    function getHospitalServices(address _hospital) external view returns (uint256[] memory) {
        return hospitalServiceIds[_hospital];
    }

    function getServiceUsage(uint256 _usageId) external view returns (PatientServiceUsage memory) {
        return serviceUsages[_usageId];
    }

    function getPolicyServiceUsages(uint256 _policyId) external view returns (uint256[] memory) {
        return policyServiceUsages[_policyId];
    }

    function getHospitalServiceCount(address _hospital) external view returns (uint256) {
        return hospitalServiceIds[_hospital].length;
    }
}
