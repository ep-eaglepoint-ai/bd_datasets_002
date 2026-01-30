/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import App from '../../repository_after/client/src/App';

beforeEach(() => {
  window.history.replaceState({}, '', '/');
  jest.clearAllMocks();
});

/**
 * REQ-7: Error handling — React shows descriptive error and re-enables purchase
 *        button when server transaction fails (e.g. 409) or network timeout.
 */
describe('Error recovery', () => {
  it('shows error message and re-enables button when purchase fails with 409', async () => {
    global.fetch = jest.fn((url: string, opts?: { method?: string }) => {
      if (url.includes('/raffle/state') && !opts?.method) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              status: 'OPEN',
              remainingTickets: 100,
              userTicketCount: 0,
            }),
        });
      }
      if (url.includes('/purchase') && opts?.method === 'POST') {
        return Promise.resolve({
          ok: false,
          status: 409,
          json: () => Promise.resolve({ success: false, error: 'Limit Reached' }),
        });
      }
      return Promise.reject(new Error('unexpected'));
    }) as jest.Mock;

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('purchase-button')).not.toBeDisabled();
    });

    fireEvent.click(screen.getByTestId('purchase-button'));

    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toHaveTextContent('Limit Reached');
    });

    await waitFor(() => {
      const btn = screen.getByTestId('purchase-button');
      expect(btn).not.toHaveTextContent('Purchasing…');
      expect(btn).not.toBeDisabled();
    });
  });

  it('shows error and re-enables button when purchase fails due to network timeout (REQ-7)', async () => {
    global.fetch = jest.fn((url: string, opts?: { method?: string }) => {
      if (url.includes('/raffle/state') && !opts?.method) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              status: 'OPEN',
              remainingTickets: 100,
              userTicketCount: 0,
            }),
        });
      }
      if (url.includes('/purchase') && opts?.method === 'POST') {
        return Promise.reject(new Error('Network timeout'));
      }
      return Promise.reject(new Error('unexpected'));
    }) as jest.Mock;

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('purchase-button')).not.toBeDisabled();
    });

    fireEvent.click(screen.getByTestId('purchase-button'));

    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toBeInTheDocument();
    });

    await waitFor(() => {
      const btn = screen.getByTestId('purchase-button');
      expect(btn).not.toHaveTextContent('Purchasing…');
      expect(btn).not.toBeDisabled();
    });
  });
});
