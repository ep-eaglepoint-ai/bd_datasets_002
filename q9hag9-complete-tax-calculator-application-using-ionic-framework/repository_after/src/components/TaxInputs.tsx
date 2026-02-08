import React from 'react';
import {
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonList,
    IonItem,
    IonLabel,
    IonInput,
    IonSelect,
    IonSelectOption
} from '@ionic/react';
import { TaxMode } from '../types/tax.types';

interface TaxInputsProps {
    annualIncome: number;
    totalDeductions: number;
    taxMode: TaxMode;
    flatTaxRate: number;
    onIncomeChange: (value: number) => void;
    onDeductionsChange: (value: number) => void;
    onTaxModeChange: (value: TaxMode) => void;
    onFlatTaxRateChange: (value: number) => void;
}

const TaxInputs: React.FC<TaxInputsProps> = ({
    annualIncome,
    totalDeductions,
    taxMode,
    flatTaxRate,
    onIncomeChange,
    onDeductionsChange,
    onTaxModeChange,
    onFlatTaxRateChange
}) => {
    return (
        <IonCard>
            <IonCardHeader>
                <IonCardTitle>Tax Calculator Inputs</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
                <IonList>
                    <IonItem>
                        <IonLabel position="stacked">Annual Income ($)</IonLabel>
                        <IonInput
                            type="number"
                            value={annualIncome}
                            onIonInput={(e) => onIncomeChange(parseFloat(e.detail.value!) || 0)}
                            placeholder="Enter your annual income"
                            data-testid="annual-income-input"
                        />
                    </IonItem>

                    <IonItem>
                        <IonLabel position="stacked">Total Deductions ($)</IonLabel>
                        <IonInput
                            type="number"
                            value={totalDeductions}
                            onIonInput={(e) => onDeductionsChange(parseFloat(e.detail.value!) || 0)}
                            placeholder="Enter your total deductions"
                            data-testid="deductions-input"
                        />
                    </IonItem>

                    <IonItem>
                        <IonLabel position="stacked">Tax Mode</IonLabel>
                        <IonSelect
                            value={taxMode}
                            onIonChange={(e) => onTaxModeChange(e.detail.value)}
                            data-testid="tax-mode-select"
                        >
                            <IonSelectOption value="flat">Flat Tax</IonSelectOption>
                            <IonSelectOption value="progressive">Progressive Tax</IonSelectOption>
                        </IonSelect>
                    </IonItem>

                    {taxMode === 'flat' && (
                        <IonItem>
                            <IonLabel position="stacked">Flat Tax Rate (%)</IonLabel>
                            <IonInput
                                type="number"
                                value={flatTaxRate}
                                onIonInput={(e) => onFlatTaxRateChange(parseFloat(e.detail.value!) || 0)}
                                placeholder="Enter flat tax rate"
                                data-testid="flat-tax-rate-input"
                            />
                        </IonItem>
                    )}
                </IonList>
            </IonCardContent>
        </IonCard>
    );
};

export default TaxInputs;
