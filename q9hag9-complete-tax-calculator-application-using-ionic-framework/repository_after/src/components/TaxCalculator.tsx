import React, { useState, useEffect } from 'react';
import {
    IonPage,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent
} from '@ionic/react';
import TaxInputs from './TaxInputs';
import TaxResults from './TaxResults';
import { calculateTaxResults } from '../utils/taxCalculations';
import { TaxMode, TaxCalculationResult } from '../types/tax.types';

const TaxCalculator: React.FC = () => {
    const [annualIncome, setAnnualIncome] = useState<number>(50000);
    const [totalDeductions, setTotalDeductions] = useState<number>(12000);
    const [taxMode, setTaxMode] = useState<TaxMode>('progressive');
    const [flatTaxRate, setFlatTaxRate] = useState<number>(15);
    const [results, setResults] = useState<TaxCalculationResult>({
        taxableIncome: 0,
        totalTax: 0,
        netIncome: 0,
        effectiveRate: 0
    });

    // Calculate tax results whenever inputs change (instant updates)
    useEffect(() => {
        const calculatedResults = calculateTaxResults(
            annualIncome,
            totalDeductions,
            taxMode,
            flatTaxRate
        );
        setResults(calculatedResults);
    }, [annualIncome, totalDeductions, taxMode, flatTaxRate]);

    return (
        <IonPage>
            <IonHeader>
                <IonToolbar>
                    <IonTitle>Tax Calculator</IonTitle>
                </IonToolbar>
            </IonHeader>
            <IonContent className="ion-padding">
                <TaxInputs
                    annualIncome={annualIncome}
                    totalDeductions={totalDeductions}
                    taxMode={taxMode}
                    flatTaxRate={flatTaxRate}
                    onIncomeChange={setAnnualIncome}
                    onDeductionsChange={setTotalDeductions}
                    onTaxModeChange={setTaxMode}
                    onFlatTaxRateChange={setFlatTaxRate}
                />
                <TaxResults results={results} />
            </IonContent>
        </IonPage>
    );
};

export default TaxCalculator;
