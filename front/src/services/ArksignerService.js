class ArksignerService {
  constructor() {
    this.isArksignerInstalled = false;
    this.testMode = true; //with test mode
    this.checkArksignerInstallation();
  }

  // check arksigner installation
  checkArksignerInstallation() {
    if (window.arksigner) {
      this.isArksignerInstalled = true;
      console.log('Arksigner extension is installed');
    } else {
      // in test mode show always installed
      this.isArksignerInstalled = this.testMode;
    }
  }

  // install arksigner extension
  installArksigner() {
    const chromeWebStoreUrl = 'https://chromewebstore.google.com/detail/arksigner/pllcidbcfbamjfbfpemnnjohnfcliakf';
    window.open(chromeWebStoreUrl, '_blank');
  }

  // verify doctor signature
  async verifyDoctorSignature(doctorData) {
    return new Promise((resolve, reject) => {
      if (!this.isArksignerInstalled) {
        reject(new Error('Arksigner extension is not installed. Please install the extension first.'));
        return;
      }

      try {
        // prepare doctor data to sign
        const dataToSign = {
          doctorName: doctorData.doctorName,
          hospital: doctorData.hospital,
          wallet: doctorData.wallet,
          timestamp: new Date().toISOString(),
          purpose: 'doctor_verification'
        };

        // in test mode create mock signature
        if (this.testMode) {
          setTimeout(() => {
            const mockSignature = this.generateMockSignature(dataToSign);
            resolve({
              success: true,
              signature: mockSignature,
              signedData: dataToSign,
            });
          }, 2000);
          return;
        }

        // real arksigner api to sign
        if (window.arksigner && window.arksigner.sign) {
          window.arksigner.sign(JSON.stringify(dataToSign))
            .then((signature) => {
              console.log('Signature success:', signature);
              resolve({
                success: true,
                signature: signature,
                signedData: dataToSign,
                message: 'Signature verification success'
              });
            })
            .catch((error) => {
              console.error('Signature error:', error);
              reject(new Error('Signature process failed: ' + error.message));
            });
        } else {
          reject(new Error('Arksigner API not found'));
        }
      } catch (error) {
        reject(new Error('Signature process failed: ' + error.message));
      }
    });
  }

  // sign document with arksigner
  async signDocument(documentData, documentType = 'medical_report') {
    return new Promise((resolve, reject) => {
      if (!this.isArksignerInstalled) {
        reject(new Error('Arksigner extension is not installed. Please install the extension first.'));
        return;
      }

      try {
        const dataToSign = {
          ...documentData,
          documentType: documentType,
          timestamp: new Date().toISOString(),
          purpose: 'document_signing'
        };

        // in test mode create mock signature
        if (this.testMode) {
          setTimeout(() => {
            const mockSignature = this.generateMockSignature(dataToSign);
            resolve({
              success: true,
              signature: mockSignature,
              signedDocument: dataToSign,
            });
          }, 2000);
          return;
        }

        // real arksigner api to sign
        if (window.arksigner && window.arksigner.sign) {
          window.arksigner.sign(JSON.stringify(dataToSign))
            .then((signature) => {
              console.log('Document signing success:', signature);
              resolve({
                success: true,
                signature: signature,
                signedDocument: dataToSign,
              });
            })
            .catch((error) => {
              console.error('Document signing error:', error);
              reject(new Error('Document signing process failed: ' + error.message));
            });
        } else {
          reject(new Error('Arksigner API not found'));
        }
      } catch (error) {
        reject(new Error('Document signing process failed: ' + error.message));
      }
    });
  }

  // verify signature
  async verifySignature(signature, originalData) {
    return new Promise((resolve, reject) => {
      if (!this.isArksignerInstalled) {
        reject(new Error('Arksigner extension is not installed. Please install the extension first.'));
        return;
      }

      try {
        if (window.arksigner && window.arksigner.verify) {
          window.arksigner.verify(signature, JSON.stringify(originalData))
            .then((verificationResult) => {
              console.log('Signature verification result:', verificationResult);
              resolve({
                success: true,
                isValid: verificationResult.valid,
                verificationData: verificationResult,
                message: verificationResult.valid ? 'Signature valid' : 'Signature invalid'
              });
            })
            .catch((error) => {
              console.error('Signature verification error:', error);
              reject(new Error('Signature verification process failed: ' + error.message));
            });
        } else {
            reject(new Error('Arksigner API not found'));
        }
      } catch (error) {
        reject(new Error('Signature verification process failed: ' + error.message));
      }
    });
  }

  // Mock signature create (for test mode)
  generateMockSignature(data) {
    const timestamp = Date.now();
    const dataHash = btoa(JSON.stringify(data)).substring(0, 16);
    return `MOCK_SIGNATURE_${dataHash}_${timestamp}`;
  }

  // check arksigner status
  getStatus() {
    return {
      isInstalled: this.isArksignerInstalled,
      hasAPI: !!(window.arksigner && window.arksigner.sign),
      version: window.arksigner?.version || (this.testMode ? 'Test Mode' : 'Unknown'),
      testMode: this.testMode
    };
  }
}

// singleton instance
const arksignerService = new ArksignerService();
export default arksignerService;