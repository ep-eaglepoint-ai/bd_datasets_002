import { ref, computed, watch } from 'vue'

export type UnitSystem = 'metric' | 'imperial'
export type BmiCategory = 'Underweight' | 'Normal' | 'Overweight' | 'Obese'

export interface BmiResult {
  bmi: number
  category: BmiCategory
  healthyWeightRange: { min: number; max: number }
  weightDifference?: { amount: number; direction: 'gain' | 'lose' }
  guidance: string
  timestamp: string
}

export interface ValidationError {
  height?: string
  weight?: string
}

export function useBmiCalculator() {
  const unitSystem = ref<UnitSystem>('metric')
  const height = ref<number | null>(null)
  const weight = ref<number | null>(null)
  const heightFeet = ref<number | null>(null)
  const heightInches = ref<number | null>(null)
  const errors = ref<ValidationError>({})

  // Validation
  const validateInputs = (): boolean => {
    errors.value = {}
    
    if (unitSystem.value === 'metric') {
      if (!height.value) {
        errors.value.height = 'Height is required'
      } else if (height.value < 50 || height.value > 300) {
        errors.value.height = 'Height must be between 50-300 cm'
      }
      
      if (!weight.value) {
        errors.value.weight = 'Weight is required'
      } else if (weight.value < 2 || weight.value > 600) {
        errors.value.weight = 'Weight must be between 2-600 kg'
      }
    } else {
      const totalInches = (heightFeet.value || 0) * 12 + (heightInches.value || 0)
      if (!heightFeet.value && !heightInches.value) {
        errors.value.height = 'Height is required'
      } else if (totalInches < 20 || totalInches > 120) {
        errors.value.height = 'Height must be between 1ft 8in - 10ft'
      }
      
      if (!weight.value) {
        errors.value.weight = 'Weight is required'
      } else if (weight.value < 4 || weight.value > 1300) {
        errors.value.weight = 'Weight must be between 4-1300 lbs'
      }
    }
    
    return Object.keys(errors.value).length === 0
  }

  const isValid = computed(() => {
    if (unitSystem.value === 'metric') {
      return height.value !== null && weight.value !== null && 
             height.value > 0 && weight.value > 0 &&
             height.value >= 50 && height.value <= 300 &&
             weight.value >= 2 && weight.value <= 600
    } else {
      const totalInches = (heightFeet.value || 0) * 12 + (heightInches.value || 0)
      return totalInches > 0 && weight.value !== null && weight.value > 0 &&
             totalInches >= 20 && totalInches <= 120 &&
             weight.value >= 4 && weight.value <= 1300
    }
  })

  // Unit conversion
  const cmToInches = (cm: number): number => cm / 2.54
  const inchesToCm = (inches: number): number => inches * 2.54
  const kgToLbs = (kg: number): number => kg * 2.20462
  const lbsToKg = (lbs: number): number => lbs / 2.20462

  const toggleUnit = () => {
    if (unitSystem.value === 'metric') {
      // Convert to imperial
      if (height.value) {
        const totalInches = cmToInches(height.value)
        heightFeet.value = Math.floor(totalInches / 12)
        heightInches.value = Math.round(totalInches % 12)
      }
      if (weight.value) {
        weight.value = Math.round(kgToLbs(weight.value) * 10) / 10
      }
      unitSystem.value = 'imperial'
    } else {
      // Convert to metric
      const totalInches = (heightFeet.value || 0) * 12 + (heightInches.value || 0)
      if (totalInches > 0) {
        height.value = Math.round(inchesToCm(totalInches))
      }
      if (weight.value) {
        weight.value = Math.round(lbsToKg(weight.value) * 10) / 10
      }
      unitSystem.value = 'metric'
    }
  }

  // BMI calculation
  const calculateBmi = (): BmiResult | null => {
    if (!validateInputs()) return null

    let heightInMeters: number
    let weightInKg: number

    if (unitSystem.value === 'metric') {
      heightInMeters = (height.value || 0) / 100
      weightInKg = weight.value || 0
    } else {
      const totalInches = (heightFeet.value || 0) * 12 + (heightInches.value || 0)
      heightInMeters = inchesToCm(totalInches) / 100
      weightInKg = lbsToKg(weight.value || 0)
    }

    const bmi = weightInKg / (heightInMeters * heightInMeters)
    const roundedBmi = Math.round(bmi * 10) / 10
    const category = getBmiCategory(roundedBmi)
    const healthyWeightRange = getHealthyWeightRange(heightInMeters)
    const weightDifference = getWeightDifference(weightInKg, healthyWeightRange, category)
    const guidance = getGuidance(category)

    return {
      bmi: roundedBmi,
      category,
      healthyWeightRange,
      weightDifference,
      guidance,
      timestamp: new Date().toISOString()
    }
  }

  const getBmiCategory = (bmi: number): BmiCategory => {
    if (bmi < 18.5) return 'Underweight'
    if (bmi < 25) return 'Normal'
    if (bmi < 30) return 'Overweight'
    return 'Obese'
  }

  const getHealthyWeightRange = (heightInMeters: number) => {
    const minWeight = 18.5 * heightInMeters * heightInMeters
    const maxWeight = 24.9 * heightInMeters * heightInMeters
    
    if (unitSystem.value === 'metric') {
      return {
        min: Math.round(minWeight * 10) / 10,
        max: Math.round(maxWeight * 10) / 10
      }
    } else {
      return {
        min: Math.round(kgToLbs(minWeight) * 10) / 10,
        max: Math.round(kgToLbs(maxWeight) * 10) / 10
      }
    }
  }

  const getWeightDifference = (
    currentWeight: number,
    healthyRange: { min: number; max: number },
    category: BmiCategory
  ) => {
    if (category === 'Normal') return undefined

    const weightInCurrentUnit = unitSystem.value === 'metric' 
      ? currentWeight 
      : kgToLbs(currentWeight)

    if (category === 'Underweight') {
      return {
        amount: Math.round((healthyRange.min - weightInCurrentUnit) * 10) / 10,
        direction: 'gain' as const
      }
    } else {
      return {
        amount: Math.round((weightInCurrentUnit - healthyRange.max) * 10) / 10,
        direction: 'lose' as const
      }
    }
  }

  const getGuidance = (category: BmiCategory): string => {
    const messages = {
      Underweight: 'Consider consulting a healthcare provider about healthy weight gain strategies.',
      Normal: 'Great! You\'re in a healthy weight range. Maintain a balanced diet and regular exercise.',
      Overweight: 'Consider adopting a healthier lifestyle with balanced nutrition and regular physical activity.',
      Obese: 'Consult with a healthcare professional for personalized advice on achieving a healthier weight.'
    }
    return messages[category]
  }

  // Validate inputs when they change
  watch([height, weight, heightFeet, heightInches, unitSystem], () => {
    validateInputs()
  }, { immediate: false })

  return {
    unitSystem,
    height,
    weight,
    heightFeet,
    heightInches,
    errors,
    isValid,
    toggleUnit,
    calculateBmi
  }
}
