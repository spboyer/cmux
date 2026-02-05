import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { UpdateToast } from './UpdateToast';
import { UpdateState } from '../../../shared/types';

describe('UpdateToast', () => {
  const defaultProps = {
    updateState: { status: 'idle' as const },
    onDownload: jest.fn(),
    onInstall: jest.fn(),
    onDismiss: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('visibility', () => {
    it('should render nothing when status is idle', () => {
      const { container } = render(<UpdateToast {...defaultProps} />);
      expect(container.firstChild).toBeNull();
    });

    it('should render nothing when status is not-available', () => {
      const { container } = render(
        <UpdateToast {...defaultProps} updateState={{ status: 'not-available' }} />
      );
      expect(container.firstChild).toBeNull();
    });

    it('should render nothing when status is dev-mode', () => {
      const { container } = render(
        <UpdateToast {...defaultProps} updateState={{ status: 'dev-mode' }} />
      );
      expect(container.firstChild).toBeNull();
    });
  });

  describe('checking state', () => {
    it('should render "Checking for updates..." when status is checking', () => {
      render(<UpdateToast {...defaultProps} updateState={{ status: 'checking' }} />);
      expect(screen.getByText('Checking for updates...')).toBeInTheDocument();
    });
  });

  describe('available state', () => {
    it('should render version and Download button when status is available', () => {
      render(
        <UpdateToast
          {...defaultProps}
          updateState={{
            status: 'available',
            info: { version: '1.2.3' },
          }}
        />
      );
      expect(screen.getByText(/Update available/)).toBeInTheDocument();
      expect(screen.getByText(/v1.2.3/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /download/i })).toBeInTheDocument();
    });

    it('should call onDownload when Download button is clicked', () => {
      const onDownload = jest.fn();
      render(
        <UpdateToast
          {...defaultProps}
          onDownload={onDownload}
          updateState={{
            status: 'available',
            info: { version: '1.2.3' },
          }}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /download/i }));
      expect(onDownload).toHaveBeenCalledTimes(1);
    });
  });

  describe('downloading state', () => {
    it('should render progress bar when status is downloading', () => {
      render(
        <UpdateToast
          {...defaultProps}
          updateState={{
            status: 'downloading',
            progress: { percent: 50, bytesPerSecond: 1000000, transferred: 5000000, total: 10000000 },
          }}
        />
      );
      expect(screen.getByText(/Downloading/)).toBeInTheDocument();
      expect(screen.getByText(/50%/)).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should show progress percentage correctly', () => {
      render(
        <UpdateToast
          {...defaultProps}
          updateState={{
            status: 'downloading',
            progress: { percent: 75, bytesPerSecond: 1000000, transferred: 7500000, total: 10000000 },
          }}
        />
      );
      expect(screen.getByText(/75%/)).toBeInTheDocument();
    });
  });

  describe('ready state', () => {
    it('should render "Restart Now" button when status is ready', () => {
      render(
        <UpdateToast
          {...defaultProps}
          updateState={{
            status: 'ready',
            info: { version: '1.2.3' },
          }}
        />
      );
      expect(screen.getByText(/Update ready/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /restart now/i })).toBeInTheDocument();
    });

    it('should call onInstall when Restart Now button is clicked', () => {
      const onInstall = jest.fn();
      render(
        <UpdateToast
          {...defaultProps}
          onInstall={onInstall}
          updateState={{
            status: 'ready',
            info: { version: '1.2.3' },
          }}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /restart now/i }));
      expect(onInstall).toHaveBeenCalledTimes(1);
    });
  });

  describe('error state', () => {
    it('should render error message when status is error', () => {
      render(
        <UpdateToast
          {...defaultProps}
          updateState={{
            status: 'error',
            error: 'Network error',
          }}
        />
      );
      expect(screen.getByText(/Update failed/)).toBeInTheDocument();
      expect(screen.getByText(/Network error/)).toBeInTheDocument();
    });
  });

  describe('dismissing', () => {
    it('should call onDismiss when dismiss button is clicked', () => {
      const onDismiss = jest.fn();
      render(
        <UpdateToast
          {...defaultProps}
          onDismiss={onDismiss}
          updateState={{
            status: 'available',
            info: { version: '1.2.3' },
          }}
        />
      );
      const dismissButton = screen.getByLabelText(/dismiss/i);
      fireEvent.click(dismissButton);
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });
  });
});
