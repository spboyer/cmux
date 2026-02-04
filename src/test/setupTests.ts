import '@testing-library/jest-dom';

// Mock window.electronAPI for renderer tests
const mockElectronAPI = {
  openDirectory: jest.fn(),
};

Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true,
});
