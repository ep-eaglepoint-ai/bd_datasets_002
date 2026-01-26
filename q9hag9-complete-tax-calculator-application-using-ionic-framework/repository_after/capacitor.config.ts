import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'io.ionic.taxcalculator',
    appName: 'tax-calculator-ionic',
    webDir: 'dist',
    server: {
        androidScheme: 'https'
    }
};

export default config;
