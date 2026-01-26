/**
 * Component integration tests for Tax Calculator
 * Tests requirements: 1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TaxCalculator from '../repository_after/src/components/TaxCalculator';
import TaxInputs from '../repository_after/src/components/TaxInputs';
import TaxResults from '../repository_after/src/components/TaxResults';

// Mock Ionic components for testing
jest.mock('@ionic/react', () => ({
    ...jest.requireActual('@ionic/react'),
    setupIonicReact: jest.fn(),
    IonApp: ({ children }: any) => <div data-testid="ion-app">{children}</div>,
    IonPage: ({ children }: any) => <div data-testid="ion-page">{children}</div>,
    IonHeader: ({ children }: any) => <div data-testid="ion-header">{children}</div>,
    IonToolbar: ({ children }: any) => <div data-testid="ion-toolbar">{children}</div>,
    IonTitle: ({ children }: any) => <div data-testid="ion-title">{children}</div>,
    IonContent: ({ children, className }: any) => <div data-testid="ion-content" className={className}>{children}</div>,
    IonCard: ({ children }: any) => <div data-testid="ion-card">{children}</div>,
    IonCardHeader: ({ children }: any) => <div data-testid="ion-card-header">{children}</div>,
    IonCardTitle: ({ children }: any) => <div data-testid="ion-card-title">{children}</div>,
    IonCardContent: ({ children }: any) => <div data-testid="ion-card-content">{children}</div>,
    IonList: ({ children }: any) => <div data-testid="ion-list">{children}</div>,
    IonItem: ({ children }: any) => <div data-testid="ion-item">{children}</div>,
    IonLabel: ({ children, position }: any) => <label data-testid="ion-label" data-position={position}>{children}</label>,
    IonInput: ({ value, onIonInput, placeholder, type, ...props }: any) => (
        <input
            {...props}
            type={type || 'text'}
            value={value || ''}
            onChange={(e) => onIonInput?.({ detail: { value: e.target.value } })}
            placeholder={placeholder}
        />
    ),
    IonSelect: ({ value, onIonChange, children, ...props }: any) => (
        <select
            {...props}
            value={value}
            onChange={(e) => onIonChange?.({ detail: { value: e.target.value } })}
        >
            {children}
        </select>
    ),
    IonSelectOption: ({ value, children }: any) => <option value={value}>{children}</option>,
}));

describe('Tax Calculator Components (Requirement 1: Ionic + React + TypeScript)', () => {
    describe('TaxInputs Component (Requirements 2, 3, 4, 5, 12)', () => {
        const mockProps = {
            annualIncome: 50000,
            totalDeductions: 12000,
            taxMode: 'progressive' as const,
            flatTaxRate: 15,
            onIncomeChange: jest.fn(),
            onDeductionsChange: jest.fn(),
            onTaxModeChange: jest.fn(),
            onFlatTaxRateChange: jest.fn(),
        };

        test('Requirement 2: displays annual income input', () => {
            render(<TaxInputs {...mockProps} />);
            const input = screen.getByTestId('annual-income-input');
            expect(input).toBeInTheDocument();
            expect(input).toHaveValue(50000);
        });

        test('Requirement 3: displays total deductions input', () => {
            render(<TaxInputs {...mockProps} />);
            const input = screen.getByTestId('deductions-input');
            expect(input).toBeInTheDocument();
            expect(input).toHaveValue(12000);
        });

        test('Requirement 4: displays tax mode selector with flat and progressive options', () => {
            render(<TaxInputs {...mockProps} />);
            const select = screen.getByTestId('tax-mode-select');
            expect(select).toBeInTheDocument();

            const options = screen.getAllByRole('option');
            expect(options).toHaveLength(2);
            expect(options[0]).toHaveTextContent('Flat Tax');
            expect(options[1]).toHaveTextContent('Progressive Tax');
        });

        test('Requirement 5: displays flat tax rate input when flat mode selected', () => {
            const flatModeProps = { ...mockProps, taxMode: 'flat' as const };
            render(<TaxInputs {...flatModeProps} />);

            const input = screen.getByTestId('flat-tax-rate-input');
            expect(input).toBeInTheDocument();
            expect(input).toHaveValue(15);
        });

        test('Requirement 5: hides flat tax rate input when progressive mode selected', () => {
            render(<TaxInputs {...mockProps} />);

            const input = screen.queryByTestId('flat-tax-rate-input');
            expect(input).not.toBeInTheDocument();
        });

        test('Requirement 12: uses Ionic components (IonInput, IonSelect, IonCard, IonList)', () => {
            render(<TaxInputs {...mockProps} />);

            expect(screen.getByTestId('ion-card')).toBeInTheDocument();
            expect(screen.getByTestId('ion-list')).toBeInTheDocument();
            expect(screen.getAllByTestId('ion-item').length).toBeGreaterThan(0);
        });

        test('handles income input changes', () => {
            render(<TaxInputs {...mockProps} />);
            const input = screen.getByTestId('annual-income-input');

            fireEvent.change(input, { target: { value: '60000' } });
            expect(mockProps.onIncomeChange).toHaveBeenCalledWith(60000);
        });

        test('handles deductions input changes', () => {
            render(<TaxInputs {...mockProps} />);
            const input = screen.getByTestId('deductions-input');

            fireEvent.change(input, { target: { value: '15000' } });
            expect(mockProps.onDeductionsChange).toHaveBeenCalledWith(15000);
        });
    });

    describe('TaxResults Component (Requirements 7, 8, 9, 10, 12)', () => {
        const mockResults = {
            taxableIncome: 38000,
            totalTax: 5700,
            netIncome: 44300,
            effectiveRate: 11.4,
        };

        test('Requirement 7: displays taxable income', () => {
            render(<TaxResults results={mockResults} />);
            const element = screen.getByTestId('taxable-income');
            expect(element).toBeInTheDocument();
            expect(element).toHaveTextContent('$38,000.00');
        });

        test('Requirement 8: displays total tax owed', () => {
            render(<TaxResults results={mockResults} />);
            const element = screen.getByTestId('total-tax');
            expect(element).toBeInTheDocument();
            expect(element).toHaveTextContent('$5,700.00');
        });

        test('Requirement 9: displays net income after tax', () => {
            render(<TaxResults results={mockResults} />);
            const element = screen.getByTestId('net-income');
            expect(element).toBeInTheDocument();
            expect(element).toHaveTextContent('$44,300.00');
        });

        test('Requirement 10: displays effective tax rate', () => {
            render(<TaxResults results={mockResults} />);
            const element = screen.getByTestId('effective-rate');
            expect(element).toBeInTheDocument();
            expect(element).toHaveTextContent('11.40%');
        });

        test('Requirement 12: uses Ionic components (IonCard, IonList)', () => {
            render(<TaxResults results={mockResults} />);

            expect(screen.getByTestId('ion-card')).toBeInTheDocument();
            expect(screen.getByTestId('ion-list')).toBeInTheDocument();
            expect(screen.getAllByTestId('ion-item').length).toBe(4);
        });
    });

    describe('TaxCalculator Component (Requirement 11: Instant Updates)', () => {
        test('Requirement 11: calculations update instantly when inputs change', async () => {
            render(<TaxCalculator />);

            // Get initial results
            const taxableIncomeElement = screen.getByTestId('taxable-income');
            const initialTaxableIncome = taxableIncomeElement.textContent;

            // Change income
            const incomeInput = screen.getByTestId('annual-income-input');
            fireEvent.change(incomeInput, { target: { value: '100000' } });

            // Results should update instantly
            await waitFor(() => {
                const updatedTaxableIncome = taxableIncomeElement.textContent;
                expect(updatedTaxableIncome).not.toBe(initialTaxableIncome);
            });
        });

        test('Requirement 12: main component uses Ionic page structure', () => {
            render(<TaxCalculator />);

            expect(screen.getByTestId('ion-page')).toBeInTheDocument();
            expect(screen.getByTestId('ion-header')).toBeInTheDocument();
            expect(screen.getByTestId('ion-content')).toBeInTheDocument();
            expect(screen.getByTestId('ion-toolbar')).toBeInTheDocument();
            expect(screen.getByTestId('ion-title')).toBeInTheDocument();
        });

        test('renders both inputs and results sections', () => {
            render(<TaxCalculator />);

            // Should have 2 cards - one for inputs, one for results
            expect(screen.getAllByTestId('ion-card')).toHaveLength(2);
        });
    });
});
