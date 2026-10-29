import '@testing-library/jest-dom';

// Mock Web Crypto API for tests if needed in node/jsdom
if (typeof window !== 'undefined' && !window.crypto?.subtle) {
  const { webcrypto } = require('crypto');
  // @ts-ignore
  window.crypto = webcrypto;
}
