import React from 'react';
import {
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonList,
    IonItem,
    IonLabel
} from '@ionic/react';
import { TaxCalculationResult } from '../types/tax.types';

interface TaxResultsProps {
    results: TaxCalculationResult;
}

const TaxResults: React.FC<TaxResultsProps> = ({ results }) => {
    const formatCurrency = (value: number): string => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(value);
    };

    const formatPercentage = (value: number): string => {
        return `${value.toFixed(2)}%`;
    };

    return (
        <IonCard>
            <IonCardHeader>
                <IonCardTitle>Tax Calculation Results</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
                <IonList>
                    <IonItem>
                        <IonLabel>
                            <h3>Taxable Income</h3>
                            <p data-testid="taxable-income">{formatCurrency(results.taxableIncome)}</p>
                        </IonLabel>
                    </IonItem>
                    <IonItem>
                        <IonLabel>
                            <h3>Total Tax Owed</h3>
                            <p data-testid="total-tax">{formatCurrency(results.totalTax)}</p>
                        </IonLabel>
                    </IonItem>
                    <IonItem>
                        <IonLabel>
                            <h3>Net Income After Tax</h3>
                            <p data-testid="net-income">{formatCurrency(results.netIncome)}</p>
                        </IonLabel>
                    </IonItem>
                    <IonItem>
                        <IonLabel>
                            <h3>Effective Tax Rate</h3>
                            <p data-testid="effective-rate">{formatPercentage(results.effectiveRate)}</p>
                        </IonLabel>
                    </IonItem>
                </IonList>
            </IonCardContent>
        </IonCard>
    );
};

export default TaxResults;
