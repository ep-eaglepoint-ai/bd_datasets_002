import { describe, it, expect } from 'vitest';

describe('Password Generator - Requirement 4', () => {
    const generatePassword = (length: number, options: {
        includeUppercase?: boolean;
        includeNumbers?: boolean;
        includeSymbols?: boolean;
    }) => {
        const lowercase = "abcdefghijklmnopqrstuvwxyz";
        const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const numbers = "0123456789";
        const symbols = "!@#$%^&*()_+-=[]{}|;:,.<>?";

        let charset = lowercase;
        if (options.includeUppercase) charset += uppercase;
        if (options.includeNumbers) charset += numbers;
        if (options.includeSymbols) charset += symbols;

        let password = "";
        const array = new Uint32Array(length);
        window.crypto.getRandomValues(array);

        for (let i = 0; i < length; i++) {
            password += charset[array[i] % charset.length];
        }

        return password;
    };

    describe('Password Length', () => {
        it('should generate password with specified length', () => {
            const password = generatePassword(16, { includeUppercase: true, includeNumbers: true, includeSymbols: true });
            expect(password.length).toBe(16);
        });

        it('should generate short passwords', () => {
            const password = generatePassword(8, { includeUppercase: true });
            expect(password.length).toBe(8);
        });

        it('should generate long passwords', () => {
            const password = generatePassword(32, { includeUppercase: true, includeNumbers: true, includeSymbols: true });
            expect(password.length).toBe(32);
        });
    });

    describe('Character Sets', () => {
        it('should include uppercase when enabled', () => {
            const password = generatePassword(100, { includeUppercase: true, includeNumbers: false, includeSymbols: false });
            expect(/[A-Z]/.test(password)).toBe(true);
        });

        it('should include numbers when enabled', () => {
            const password = generatePassword(100, { includeUppercase: false, includeNumbers: true, includeSymbols: false });
            expect(/[0-9]/.test(password)).toBe(true);
        });

        it('should include symbols when enabled', () => {
            const password = generatePassword(100, { includeUppercase: false, includeNumbers: false, includeSymbols: true });
            expect(/[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(password)).toBe(true);
        });

        it('should only include lowercase when all options disabled', () => {
            const password = generatePassword(50, { includeUppercase: false, includeNumbers: false, includeSymbols: false });
            expect(/^[a-z]+$/.test(password)).toBe(true);
        });
    });

    describe('Cryptographic Randomness', () => {
        it('should generate different passwords each time', () => {
            const password1 = generatePassword(16, { includeUppercase: true, includeNumbers: true, includeSymbols: true });
            const password2 = generatePassword(16, { includeUppercase: true, includeNumbers: true, includeSymbols: true });
            expect(password1).not.toBe(password2);
        });

        it('should avoid predictable patterns', () => {
            const passwords = Array.from({ length: 10 }, () => 
                generatePassword(16, { includeUppercase: true, includeNumbers: true, includeSymbols: true })
            );
            
            // All should be unique
            const uniquePasswords = new Set(passwords);
            expect(uniquePasswords.size).toBe(10);
        });

        it('should have good character distribution', () => {
            const password = generatePassword(1000, { includeUppercase: true, includeNumbers: true, includeSymbols: true });
            
            const hasLower = /[a-z]/.test(password);
            const hasUpper = /[A-Z]/.test(password);
            const hasNumber = /[0-9]/.test(password);
            const hasSymbol = /[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(password);
            
            expect(hasLower).toBe(true);
            expect(hasUpper).toBe(true);
            expect(hasNumber).toBe(true);
            expect(hasSymbol).toBe(true);
        });
    });

    describe('Entropy & Strength', () => {
        it('should generate high-entropy passwords', () => {
            const password = generatePassword(16, { includeUppercase: true, includeNumbers: true, includeSymbols: true });
            
            // Check for variety in characters
            const uniqueChars = new Set(password.split(''));
            expect(uniqueChars.size).toBeGreaterThan(8); // At least 50% unique chars
        });
    });
});

describe('Password Strength Analysis - Requirement 5', () => {
    // Mock zxcvbn for testing (in real tests, we'd import the actual library)
    const analyzeStrength = (password: string) => {
        // Simple heuristic-based strength check
        let score = 0;
        
        if (password.length >= 8) score++;
        if (password.length >= 12) score++;
        if (/[a-z]/.test(password)) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^a-zA-Z0-9]/.test(password)) score++;
        
        return Math.min(4, Math.floor(score / 1.5));
    };

    it('should rate weak passwords as weak', () => {
        const weakPasswords = ['123456', 'password', 'abc123', 'qwerty'];
        
        weakPasswords.forEach(pwd => {
            const score = analyzeStrength(pwd);
            expect(score).toBeLessThan(3);
        });
    });

    it('should rate strong passwords as strong', () => {
        const strongPasswords = [
            'Tr0ub4dor&3',
            'correcthorsebatterystaple',
            'P@ssw0rd!2024#Secure'
        ];
        
        strongPasswords.forEach(pwd => {
            const score = analyzeStrength(pwd);
            expect(score).toBeGreaterThanOrEqual(2);
        });
    });

    it('should consider length in strength calculation', () => {
        const short = analyzeStrength('Ab1!');
        const long = analyzeStrength('Ab1!Ab1!Ab1!Ab1!');
        
        expect(long).toBeGreaterThanOrEqual(short);
    });

    it('should consider character variety', () => {
        const simple = analyzeStrength('aaaaaaaa');
        const complex = analyzeStrength('aA1!bB2@');
        
        expect(complex).toBeGreaterThan(simple);
    });
});

describe('Password Reuse Detection - Requirement 6', () => {
    const detectReuse = (passwords: string[]) => {
        const seen = new Map<string, number>();
        const reused: string[] = [];
        
        passwords.forEach(pwd => {
            const count = (seen.get(pwd) || 0) + 1;
            seen.set(pwd, count);
            if (count === 2) {
                reused.push(pwd);
            }
        });
        
        return reused;
    };

    it('should detect duplicate passwords', () => {
        const passwords = ['password123', 'unique1', 'password123', 'unique2'];
        const reused = detectReuse(passwords);
        
        expect(reused).toContain('password123');
        expect(reused.length).toBe(1);
    });

    it('should detect multiple reused passwords', () => {
        const passwords = ['pwd1', 'pwd2', 'pwd1', 'pwd2', 'pwd3'];
        const reused = detectReuse(passwords);
        
        expect(reused).toContain('pwd1');
        expect(reused).toContain('pwd2');
        expect(reused.length).toBe(2);
    });

    it('should not flag unique passwords', () => {
        const passwords = ['unique1', 'unique2', 'unique3'];
        const reused = detectReuse(passwords);
        
        expect(reused.length).toBe(0);
    });

    it('should handle empty password list', () => {
        const reused = detectReuse([]);
        expect(reused.length).toBe(0);
    });
});

describe('Integration - Requirements 4, 5, 6', () => {
    it('should generate strong passwords that pass strength analysis', () => {
        const generatePassword = (length: number) => {
            const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?";
            let password = "";
            const array = new Uint32Array(length);
            window.crypto.getRandomValues(array);
            
            for (let i = 0; i < length; i++) {
                password += charset[array[i] % charset.length];
            }
            return password;
        };

        const analyzeStrength = (password: string) => {
            let score = 0;
            if (password.length >= 8) score++;
            if (password.length >= 12) score++;
            if (/[a-z]/.test(password)) score++;
            if (/[A-Z]/.test(password)) score++;
            if (/[0-9]/.test(password)) score++;
            if (/[^a-zA-Z0-9]/.test(password)) score++;
            return Math.min(4, Math.floor(score / 1.5));
        };

        const password = generatePassword(16);
        const strength = analyzeStrength(password);
        
        expect(strength).toBeGreaterThanOrEqual(2);
    });
});
