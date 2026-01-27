import { describe, it, expect, beforeEach } from 'vitest';
import { useBmiCalculator } from '../repository_after/src/composables/useBmiCalculator';


describe('useBmiCalculator - Core Functionality', () => {
  let calculator: ReturnType<typeof useBmiCalculator>;

  beforeEach(() => {
    calculator = useBmiCalculator();
  });

  describe('BMI Calculation - Metric System', () => {
    it('should calculate BMI correctly for normal weight (metric)', () => {
      calculator.unitSystem.value = 'metric';
      calculator.height.value = 180; // cm
      calculator.weight.value = 75; // kg
      
      const result = calculator.calculateBmi();
      
      expect(result).not.toBeNull();
      expect(result!.bmi).toBe(23.1); // 75 / (1.8 * 1.8) = 23.148... rounded to 23.1
      expect(result!.category).toBe('Normal');
    });

    it('should calculate BMI correctly for underweight (metric)', () => {
      calculator.unitSystem.value = 'metric';
      calculator.height.value = 180; // cm
      calculator.weight.value = 55; // kg
      
      const result = calculator.calculateBmi();
      
      expect(result).not.toBeNull();
      expect(result!.bmi).toBe(17.0); // 55 / (1.8 * 1.8) = 16.975... rounded to 17.0
      expect(result!.category).toBe('Underweight');
    });

    it('should calculate BMI correctly for overweight (metric)', () => {
      calculator.unitSystem.value = 'metric';
      calculator.height.value = 170; // cm
      calculator.weight.value = 85; // kg
      
      const result = calculator.calculateBmi();
      
      expect(result).not.toBeNull();
      expect(result!.bmi).toBe(29.4); // 85 / (1.7 * 1.7) = 29.411... rounded to 29.4
      expect(result!.category).toBe('Overweight');
    });

    it('should calculate BMI correctly for obese (metric)', () => {
      calculator.unitSystem.value = 'metric';
      calculator.height.value = 170; // cm
      calculator.weight.value = 100; // kg
      
      const result = calculator.calculateBmi();
      
      expect(result).not.toBeNull();
      expect(result!.bmi).toBe(34.6); // 100 / (1.7 * 1.7) = 34.602... rounded to 34.6
      expect(result!.category).toBe('Obese');
    });

    it('should round BMI to 1 decimal place', () => {
      calculator.unitSystem.value = 'metric';
      calculator.height.value = 175; // cm
      calculator.weight.value = 70.3; // kg
      
      const result = calculator.calculateBmi();
      
      expect(result).not.toBeNull();
      // 70.3 / (1.75 * 1.75) = 22.971... should round to 23.0
      expect(result!.bmi).toBe(23.0);
      expect(result!.bmi.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(1);
    });
  });

  describe('BMI Calculation - Imperial System', () => {
    it('should calculate BMI correctly for normal weight (imperial)', () => {
      calculator.unitSystem.value = 'imperial';
      calculator.heightFeet.value = 5;
      calculator.heightInches.value = 10; // 70 inches total
      calculator.weight.value = 154; // lbs
      
      const result = calculator.calculateBmi();
      
      expect(result).not.toBeNull();
      // 70 inches = 177.8 cm = 1.778 m
      // 154 lbs = 69.85 kg
      // BMI = 69.85 / (1.778 * 1.778) = 22.1
      expect(result!.bmi).toBeGreaterThanOrEqual(22.0);
      expect(result!.bmi).toBeLessThanOrEqual(22.2);
      expect(result!.category).toBe('Normal');
    });

    it('should calculate BMI correctly with feet and inches', () => {
      calculator.unitSystem.value = 'imperial';
      calculator.heightFeet.value = 6;
      calculator.heightInches.value = 2; // 74 inches total
      calculator.weight.value = 180; // lbs
      
      const result = calculator.calculateBmi();
      
      expect(result).not.toBeNull();
      expect(result!.category).toBe('Normal');
    });

    it('should handle zero inches correctly', () => {
      calculator.unitSystem.value = 'imperial';
      calculator.heightFeet.value = 5;
      calculator.heightInches.value = 0;
      calculator.weight.value = 120; // lbs
      
      const result = calculator.calculateBmi();
      
      expect(result).not.toBeNull();
      // 60 inches = 152.4 cm = 1.524 m
      // 120 lbs = 54.43 kg
      // BMI = 54.43 / (1.524 * 1.524) = 23.4
      expect(result!.bmi).toBeGreaterThan(20);
      expect(result!.category).toBe('Normal');
    });
  });

  describe('BMI Categorization - WHO Standards', () => {
    it('should categorize BMI < 18.5 as Underweight', () => {
      calculator.unitSystem.value = 'metric';
      calculator.height.value = 180;
      calculator.weight.value = 55; // BMI ~17.0
      
      const result = calculator.calculateBmi();
      
      expect(result).not.toBeNull();
      expect(result!.category).toBe('Underweight');
      expect(result!.bmi).toBeLessThan(18.5);
    });

    it('should categorize BMI 18.5-24.9 as Normal', () => {
      calculator.unitSystem.value = 'metric';
      calculator.height.value = 180;
      calculator.weight.value = 75; // BMI ~23.1
      
      const result = calculator.calculateBmi();
      
      expect(result).not.toBeNull();
      expect(result!.category).toBe('Normal');
      expect(result!.bmi).toBeGreaterThanOrEqual(18.5);
      expect(result!.bmi).toBeLessThan(25);
    });

    it('should categorize BMI 25-29.9 as Overweight', () => {
      calculator.unitSystem.value = 'metric';
      calculator.height.value = 170;
      calculator.weight.value = 85; // BMI ~29.4
      
      const result = calculator.calculateBmi();
      
      expect(result).not.toBeNull();
      expect(result!.category).toBe('Overweight');
      expect(result!.bmi).toBeGreaterThanOrEqual(25);
      expect(result!.bmi).toBeLessThan(30);
    });

    it('should categorize BMI >= 30 as Obese', () => {
      calculator.unitSystem.value = 'metric';
      calculator.height.value = 170;
      calculator.weight.value = 100; // BMI ~34.6
      
      const result = calculator.calculateBmi();
      
      expect(result).not.toBeNull();
      expect(result!.category).toBe('Obese');
      expect(result!.bmi).toBeGreaterThanOrEqual(30);
    });

    it('should correctly categorize boundary values', () => {
      // Test exact boundary: 18.5
      calculator.unitSystem.value = 'metric';
      calculator.height.value = 180;
      calculator.weight.value = 59.94; // Should give BMI ~18.5
      
      const result1 = calculator.calculateBmi();
      expect(result1).not.toBeNull();
      expect(result1!.category).toBe('Normal');

      // Test exact boundary: 25.0
      calculator.weight.value = 81; // Should give BMI ~25.0
      const result2 = calculator.calculateBmi();
      expect(result2).not.toBeNull();
      expect(result2!.category).toBe('Overweight');

      // Test exact boundary: 30.0
      calculator.weight.value = 97.2; // Should give BMI ~30.0
      const result3 = calculator.calculateBmi();
      expect(result3).not.toBeNull();
      expect(result3!.category).toBe('Obese');
    });
  });

  describe('Healthy Weight Range Calculation', () => {
    it('should calculate healthy weight range correctly (metric)', () => {
      calculator.unitSystem.value = 'metric';
      calculator.height.value = 180; // 1.8 m
      calculator.weight.value = 75;
      
      const result = calculator.calculateBmi();
      
      expect(result).not.toBeNull();
      // Healthy range: 18.5 * 1.8^2 to 24.9 * 1.8^2
      // = 59.94 to 80.676 kg
      expect(result!.healthyWeightRange.min).toBeGreaterThanOrEqual(59.9);
      expect(result!.healthyWeightRange.min).toBeLessThanOrEqual(60.0);
      expect(result!.healthyWeightRange.max).toBeGreaterThanOrEqual(80.6);
      expect(result!.healthyWeightRange.max).toBeLessThanOrEqual(80.7);
    });

    it('should calculate healthy weight range correctly (imperial)', () => {
      calculator.unitSystem.value = 'imperial';
      calculator.heightFeet.value = 5;
      calculator.heightInches.value = 10; // 70 inches = 1.778 m
      calculator.weight.value = 154;
      
      const result = calculator.calculateBmi();
      
      expect(result).not.toBeNull();
      // Healthy range should be in lbs
      expect(result!.healthyWeightRange.min).toBeGreaterThan(100);
      expect(result!.healthyWeightRange.max).toBeLessThan(200);
    });

    it('should round healthy weight range to 1 decimal place', () => {
      calculator.unitSystem.value = 'metric';
      calculator.height.value = 175;
      calculator.weight.value = 70;
      
      const result = calculator.calculateBmi();
      
      expect(result).not.toBeNull();
      const minDecimals = result!.healthyWeightRange.min.toString().split('.')[1]?.length || 0;
      const maxDecimals = result!.healthyWeightRange.max.toString().split('.')[1]?.length || 0;
      expect(minDecimals).toBeLessThanOrEqual(1);
      expect(maxDecimals).toBeLessThanOrEqual(1);
    });
  });

  describe('Weight Difference Recommendations', () => {
    it('should recommend weight gain for underweight', () => {
      calculator.unitSystem.value = 'metric';
      calculator.height.value = 180;
      calculator.weight.value = 55; // Underweight
      
      const result = calculator.calculateBmi();
      
      expect(result).not.toBeNull();
      expect(result!.weightDifference).toBeDefined();
      expect(result!.weightDifference!.direction).toBe('gain');
      expect(result!.weightDifference!.amount).toBeGreaterThan(0);
    });

    it('should not provide weight difference for normal weight', () => {
      calculator.unitSystem.value = 'metric';
      calculator.height.value = 180;
      calculator.weight.value = 75; // Normal
      
      const result = calculator.calculateBmi();
      
      expect(result).not.toBeNull();
      expect(result!.weightDifference).toBeUndefined();
    });

    it('should recommend weight loss for overweight', () => {
      calculator.unitSystem.value = 'metric';
      calculator.height.value = 170;
      calculator.weight.value = 85; // Overweight
      
      const result = calculator.calculateBmi();
      
      expect(result).not.toBeNull();
      expect(result!.weightDifference).toBeDefined();
      expect(result!.weightDifference!.direction).toBe('lose');
      expect(result!.weightDifference!.amount).toBeGreaterThan(0);
    });

    it('should recommend weight loss for obese', () => {
      calculator.unitSystem.value = 'metric';
      calculator.height.value = 170;
      calculator.weight.value = 100; // Obese
      
      const result = calculator.calculateBmi();
      
      expect(result).not.toBeNull();
      expect(result!.weightDifference).toBeDefined();
      expect(result!.weightDifference!.direction).toBe('lose');
      expect(result!.weightDifference!.amount).toBeGreaterThan(0);
    });

    it('should calculate weight difference in correct units (metric)', () => {
      calculator.unitSystem.value = 'metric';
      calculator.height.value = 170;
      calculator.weight.value = 90; // Overweight
      
      const result = calculator.calculateBmi();
      
      expect(result).not.toBeNull();
      expect(result!.weightDifference).toBeDefined();
      // Should be in kg
      expect(result!.weightDifference!.amount).toBeGreaterThan(5);
      expect(result!.weightDifference!.amount).toBeLessThan(20);
    });

    it('should calculate weight difference in correct units (imperial)', () => {
      calculator.unitSystem.value = 'imperial';
      calculator.heightFeet.value = 5;
      calculator.heightInches.value = 8; // 68 inches
      calculator.weight.value = 200; // Overweight
      
      const result = calculator.calculateBmi();
      
      expect(result).not.toBeNull();
      expect(result!.weightDifference).toBeDefined();
      // Should be in lbs
      expect(result!.weightDifference!.amount).toBeGreaterThan(10);
    });
  });

  describe('Guidance Messages', () => {
    it('should provide appropriate guidance for underweight', () => {
      calculator.unitSystem.value = 'metric';
      calculator.height.value = 180;
      calculator.weight.value = 55;
      
      const result = calculator.calculateBmi();
      
      expect(result).not.toBeNull();
      expect(result!.guidance).toContain('healthcare');
      expect(result!.guidance.length).toBeGreaterThan(20);
    });

    it('should provide appropriate guidance for normal weight', () => {
      calculator.unitSystem.value = 'metric';
      calculator.height.value = 180;
      calculator.weight.value = 75;
      
      const result = calculator.calculateBmi();
      
      expect(result).not.toBeNull();
      expect(result!.guidance).toContain('healthy');
      expect(result!.guidance.length).toBeGreaterThan(20);
    });

    it('should provide appropriate guidance for overweight', () => {
      calculator.unitSystem.value = 'metric';
      calculator.height.value = 170;
      calculator.weight.value = 85;
      
      const result = calculator.calculateBmi();
      
      expect(result).not.toBeNull();
      expect(result!.guidance).toContain('lifestyle');
      expect(result!.guidance.length).toBeGreaterThan(20);
    });

    it('should provide appropriate guidance for obese', () => {
      calculator.unitSystem.value = 'metric';
      calculator.height.value = 170;
      calculator.weight.value = 100;
      
      const result = calculator.calculateBmi();
      
      expect(result).not.toBeNull();
      expect(result!.guidance).toContain('healthcare');
      expect(result!.guidance.length).toBeGreaterThan(20);
    });
  });

  describe('Timestamp Generation', () => {
    it('should include ISO timestamp in result', () => {
      calculator.unitSystem.value = 'metric';
      calculator.height.value = 180;
      calculator.weight.value = 75;
      
      const beforeTime = new Date().toISOString();
      const result = calculator.calculateBmi();
      const afterTime = new Date().toISOString();
      
      expect(result).not.toBeNull();
      expect(result!.timestamp).toBeDefined();
      expect(result!.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      
      // Timestamp should be between before and after
      expect(result!.timestamp >= beforeTime).toBe(true);
      expect(result!.timestamp <= afterTime).toBe(true);
    });
  });
});

describe('useBmiCalculator - Input Validation', () => {
  let calculator: ReturnType<typeof useBmiCalculator>;

  beforeEach(() => {
    calculator = useBmiCalculator();
  });

  describe('Metric System Validation', () => {
    it('should require height input', () => {
      calculator.unitSystem.value = 'metric';
      calculator.height.value = null;
      calculator.weight.value = 75;
      
      const result = calculator.calculateBmi();
      
      expect(result).toBeNull();
      expect(calculator.errors.value.height).toBe('Height is required');
    });

    it('should require weight input', () => {
      calculator.unitSystem.value = 'metric';
      calculator.height.value = 180;
      calculator.weight.value = null;
      
      const result = calculator.calculateBmi();
      
      expect(result).toBeNull();
      expect(calculator.errors.value.weight).toBe('Weight is required');
    });

    it('should validate height minimum (50 cm)', () => {
      calculator.unitSystem.value = 'metric';
      calculator.height.value = 49;
      calculator.weight.value = 75;
      
      const result = calculator.calculateBmi();
      
      expect(result).toBeNull();
      expect(calculator.errors.value.height).toBe('Height must be between 50-300 cm');
    });

    it('should validate height maximum (300 cm)', () => {
      calculator.unitSystem.value = 'metric';
      calculator.height.value = 301;
      calculator.weight.value = 75;
      
      const result = calculator.calculateBmi();
      
      expect(result).toBeNull();
      expect(calculator.errors.value.height).toBe('Height must be between 50-300 cm');
    });

    it('should validate weight minimum (2 kg)', () => {
      calculator.unitSystem.value = 'metric';
      calculator.height.value = 180;
      calculator.weight.value = 1;
      
      const result = calculator.calculateBmi();
      
      expect(result).toBeNull();
      expect(calculator.errors.value.weight).toBe('Weight must be between 2-600 kg');
    });

    it('should validate weight maximum (600 kg)', () => {
      calculator.unitSystem.value = 'metric';
      calculator.height.value = 180;
      calculator.weight.value = 601;
      
      const result = calculator.calculateBmi();
      
      expect(result).toBeNull();
      expect(calculator.errors.value.weight).toBe('Weight must be between 2-600 kg');
    });

    it('should accept valid boundary values', () => {
      calculator.unitSystem.value = 'metric';
      calculator.height.value = 50; // Minimum valid
      calculator.weight.value = 2; // Minimum valid
      
      const result = calculator.calculateBmi();
      
      expect(result).not.toBeNull();
      expect(Object.keys(calculator.errors.value).length).toBe(0);
    });

    it('should accept maximum boundary values', () => {
      calculator.unitSystem.value = 'metric';
      calculator.height.value = 300; // Maximum valid
      calculator.weight.value = 600; // Maximum valid
      
      const result = calculator.calculateBmi();
      
      expect(result).not.toBeNull();
      expect(Object.keys(calculator.errors.value).length).toBe(0);
    });
  });

  describe('Imperial System Validation', () => {
    it('should require height input (feet or inches)', () => {
      calculator.unitSystem.value = 'imperial';
      calculator.heightFeet.value = null;
      calculator.heightInches.value = null;
      calculator.weight.value = 154;
      
      const result = calculator.calculateBmi();
      
      expect(result).toBeNull();
      expect(calculator.errors.value.height).toBe('Height is required');
    });

    it('should accept height with only feet', () => {
      calculator.unitSystem.value = 'imperial';
      calculator.heightFeet.value = 5;
      calculator.heightInches.value = null;
      calculator.weight.value = 120;
      
      const result = calculator.calculateBmi();
      
      expect(result).not.toBeNull();
    });

    it('should accept height with only inches', () => {
      calculator.unitSystem.value = 'imperial';
      calculator.heightFeet.value = null;
      calculator.heightInches.value = 60;
      calculator.weight.value = 120;
      
      const result = calculator.calculateBmi();
      
      expect(result).not.toBeNull();
    });

    it('should validate total height minimum (20 inches = 1ft 8in)', () => {
      calculator.unitSystem.value = 'imperial';
      calculator.heightFeet.value = 1;
      calculator.heightInches.value = 7; // Total: 19 inches
      calculator.weight.value = 100;
      
      const result = calculator.calculateBmi();
      
      expect(result).toBeNull();
      expect(calculator.errors.value.height).toBe('Height must be between 1ft 8in - 10ft');
    });

    it('should validate total height maximum (120 inches = 10ft)', () => {
      calculator.unitSystem.value = 'imperial';
      calculator.heightFeet.value = 10;
      calculator.heightInches.value = 1; // Total: 121 inches
      calculator.weight.value = 200;
      
      const result = calculator.calculateBmi();
      
      expect(result).toBeNull();
      expect(calculator.errors.value.height).toBe('Height must be between 1ft 8in - 10ft');
    });

    it('should validate weight minimum (4 lbs)', () => {
      calculator.unitSystem.value = 'imperial';
      calculator.heightFeet.value = 5;
      calculator.heightInches.value = 10;
      calculator.weight.value = 3;
      
      const result = calculator.calculateBmi();
      
      expect(result).toBeNull();
      expect(calculator.errors.value.weight).toBe('Weight must be between 4-1300 lbs');
    });

    it('should validate weight maximum (1300 lbs)', () => {
      calculator.unitSystem.value = 'imperial';
      calculator.heightFeet.value = 5;
      calculator.heightInches.value = 10;
      calculator.weight.value = 1301;
      
      const result = calculator.calculateBmi();
      
      expect(result).toBeNull();
      expect(calculator.errors.value.weight).toBe('Weight must be between 4-1300 lbs');
    });
  });

  describe('isValid Computed Property', () => {
    it('should return false when inputs are invalid (metric)', () => {
      calculator.unitSystem.value = 'metric';
      calculator.height.value = null;
      calculator.weight.value = 75;
      
      expect(calculator.isValid.value).toBe(false);
    });

    it('should return true when inputs are valid (metric)', () => {
      calculator.unitSystem.value = 'metric';
      calculator.height.value = 180;
      calculator.weight.value = 75;
      
      expect(calculator.isValid.value).toBe(true);
    });

    it('should return false when inputs are invalid (imperial)', () => {
      calculator.unitSystem.value = 'imperial';
      calculator.heightFeet.value = null;
      calculator.heightInches.value = null;
      calculator.weight.value = 154;
      
      expect(calculator.isValid.value).toBe(false);
    });

    it('should return true when inputs are valid (imperial)', () => {
      calculator.unitSystem.value = 'imperial';
      calculator.heightFeet.value = 5;
      calculator.heightInches.value = 10;
      calculator.weight.value = 154;
      
      expect(calculator.isValid.value).toBe(true);
    });
  });
});

describe('useBmiCalculator - Unit Conversion', () => {
  let calculator: ReturnType<typeof useBmiCalculator>;

  beforeEach(() => {
    calculator = useBmiCalculator();
  });

  describe('Metric to Imperial Conversion', () => {
    it('should convert height from cm to feet/inches', () => {
      calculator.unitSystem.value = 'metric';
      calculator.height.value = 180; // cm
      calculator.weight.value = 75; // kg
      
      calculator.toggleUnit();
      
      expect(calculator.unitSystem.value).toBe('imperial');
      // 180 cm = 70.866 inches = 5ft 10.866in ≈ 5ft 11in
      expect(calculator.heightFeet.value).toBe(5);
      expect(calculator.heightInches.value).toBeGreaterThanOrEqual(10);
      expect(calculator.heightInches.value).toBeLessThanOrEqual(11);
    });

    it('should convert weight from kg to lbs', () => {
      calculator.unitSystem.value = 'metric';
      calculator.height.value = 180;
      calculator.weight.value = 75; // kg
      
      calculator.toggleUnit();
      
      expect(calculator.unitSystem.value).toBe('imperial');
      // 75 kg * 2.20462 = 165.3465 lbs ≈ 165.3 lbs
      expect(calculator.weight.value).toBeGreaterThanOrEqual(165.3);
      expect(calculator.weight.value).toBeLessThanOrEqual(165.4);
    });

    it('should maintain calculation accuracy after conversion', () => {
      calculator.unitSystem.value = 'metric';
      calculator.height.value = 180;
      calculator.weight.value = 75;
      
      const metricResult = calculator.calculateBmi();
      
      calculator.toggleUnit();
      const imperialResult = calculator.calculateBmi();
      
      expect(metricResult).not.toBeNull();
      expect(imperialResult).not.toBeNull();
      // BMI should be the same regardless of units
      expect(Math.abs(metricResult!.bmi - imperialResult!.bmi)).toBeLessThan(0.2);
    });
  });

  describe('Imperial to Metric Conversion', () => {
    it('should convert height from feet/inches to cm', () => {
      calculator.unitSystem.value = 'imperial';
      calculator.heightFeet.value = 5;
      calculator.heightInches.value = 10; // 70 inches
      calculator.weight.value = 154;
      
      calculator.toggleUnit();
      
      expect(calculator.unitSystem.value).toBe('metric');
      // 70 inches * 2.54 = 177.8 cm ≈ 178 cm
      expect(calculator.height.value).toBeGreaterThanOrEqual(177);
      expect(calculator.height.value).toBeLessThanOrEqual(178);
    });

    it('should convert weight from lbs to kg', () => {
      calculator.unitSystem.value = 'imperial';
      calculator.heightFeet.value = 5;
      calculator.heightInches.value = 10;
      calculator.weight.value = 154; // lbs
      
      calculator.toggleUnit();
      
      expect(calculator.unitSystem.value).toBe('metric');
      // 154 lbs / 2.20462 = 69.853 kg ≈ 69.9 kg
      expect(calculator.weight.value).toBeGreaterThanOrEqual(69.8);
      expect(calculator.weight.value).toBeLessThanOrEqual(69.9);
    });
  });

  describe('Conversion Edge Cases', () => {
    it('should handle null height during conversion', () => {
      calculator.unitSystem.value = 'metric';
      calculator.height.value = null;
      calculator.weight.value = 75;
      
      calculator.toggleUnit();
      
      expect(calculator.unitSystem.value).toBe('imperial');
      // Should not crash, heightFeet/inches may be null
    });

    it('should handle null weight during conversion', () => {
      calculator.unitSystem.value = 'metric';
      calculator.height.value = 180;
      calculator.weight.value = null;
      
      calculator.toggleUnit();
      
      expect(calculator.unitSystem.value).toBe('imperial');
      // Should not crash
    });

    it('should round converted values appropriately', () => {
      calculator.unitSystem.value = 'metric';
      calculator.height.value = 175;
      calculator.weight.value = 70.5;
      
      calculator.toggleUnit();
      
      // Check that values are rounded to reasonable precision
      if (calculator.heightFeet.value !== null) {
        expect(Number.isInteger(calculator.heightFeet.value)).toBe(true);
      }
      if (calculator.weight.value !== null) {
        const decimals = calculator.weight.value.toString().split('.')[1]?.length || 0;
        expect(decimals).toBeLessThanOrEqual(1);
      }
    });
  });
});

describe('useBmiCalculator - Adversarial Testing', () => {
  let calculator: ReturnType<typeof useBmiCalculator>;

  beforeEach(() => {
    calculator = useBmiCalculator();
  });

  it('should handle extremely small valid inputs', () => {
    calculator.unitSystem.value = 'metric';
    calculator.height.value = 50; // Minimum
    calculator.weight.value = 2; // Minimum
    
    const result = calculator.calculateBmi();
    
    expect(result).not.toBeNull();
    expect(result!.bmi).toBeGreaterThan(0);
  });

  it('should handle extremely large valid inputs', () => {
    calculator.unitSystem.value = 'metric';
    calculator.height.value = 300; // Maximum
    calculator.weight.value = 600; // Maximum
    
    const result = calculator.calculateBmi();
    
    expect(result).not.toBeNull();
    expect(result!.bmi).toBeGreaterThan(0);
  });

  it('should handle decimal inputs correctly', () => {
    calculator.unitSystem.value = 'metric';
    calculator.height.value = 175.5;
    calculator.weight.value = 70.3;
    
    const result = calculator.calculateBmi();
    
    expect(result).not.toBeNull();
    expect(Number.isFinite(result!.bmi)).toBe(true);
  });

  it('should clear errors when valid inputs are provided', () => {
    calculator.unitSystem.value = 'metric';
    calculator.height.value = null;
    calculator.weight.value = null;
    
      calculator.calculateBmi(); // This will set errors
      expect(Object.keys(calculator.errors.value).length).toBeGreaterThan(0);
      
      calculator.height.value = 180;
      calculator.weight.value = 75;
      
      const result = calculator.calculateBmi();
      
      expect(result).not.toBeNull();
      expect(Object.keys(calculator.errors.value).length).toBe(0);
  });

  it('should handle rapid unit toggling without errors', () => {
    calculator.unitSystem.value = 'metric';
    calculator.height.value = 180;
    calculator.weight.value = 75;
    
      // Toggle multiple times
      for (let i = 0; i < 5; i++) {
        calculator.toggleUnit();
      }
      
      const result = calculator.calculateBmi();
      
      expect(result).not.toBeNull();
      expect(Number.isFinite(result!.bmi)).toBe(true);
  });
});
