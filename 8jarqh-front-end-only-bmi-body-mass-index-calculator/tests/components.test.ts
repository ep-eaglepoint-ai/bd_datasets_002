import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import FormInputs from '../repository_after/src/components/FormInputs.vue';
import ResultCard from '../repository_after/src/components/ResultCard.vue';
import HistoryList from '../repository_after/src/components/HistoryList.vue';
import ThemeToggle from '../repository_after/src/components/ThemeToggle.vue';
import GaugeBar from '../repository_after/src/components/GaugeBar.vue';
import type { BmiResult, UnitSystem } from '../repository_after/src/composables/useBmiCalculator';



describe('FormInputs Component', () => {
  const defaultProps = {
    unitSystem: 'metric' as UnitSystem,
    height: 180,
    weight: 75,
    heightFeet: null,
    heightInches: null,
    errors: {},
    isValid: true,
  };

  it('should render metric inputs by default', () => {
    const wrapper = mount(FormInputs, {
      props: defaultProps,
    });

    expect(wrapper.find('#height').exists()).toBe(true);
    expect(wrapper.find('#weight').exists()).toBe(true);
    expect(wrapper.text()).toContain('cm');
    expect(wrapper.text()).toContain('kg');
  });

  it('should render imperial inputs when unitSystem is imperial', () => {
    const wrapper = mount(FormInputs, {
      props: {
        ...defaultProps,
        unitSystem: 'imperial',
        heightFeet: 5,
        heightInches: 10,
      },
    });

    expect(wrapper.find('#height-feet').exists()).toBe(true);
    expect(wrapper.find('#height-inches').exists()).toBe(true);
    expect(wrapper.text()).toContain('ft');
    expect(wrapper.text()).toContain('in');
    expect(wrapper.text()).toContain('lbs');
  });

  it('should display error messages when errors are present', () => {
    const wrapper = mount(FormInputs, {
      props: {
        ...defaultProps,
        errors: {
          height: 'Height is required',
          weight: 'Weight is required',
        },
      },
    });

    expect(wrapper.text()).toContain('Height is required');
    expect(wrapper.text()).toContain('Weight is required');
  });

  it('should apply error class to inputs with errors', () => {
    const wrapper = mount(FormInputs, {
      props: {
        ...defaultProps,
        errors: {
          height: 'Height is required',
        },
      },
    });

    const heightInput = wrapper.find('#height');
    expect(heightInput.classes()).toContain('error');
  });

  it('should disable calculate button when isValid is false', () => {
    const wrapper = mount(FormInputs, {
      props: {
        ...defaultProps,
        isValid: false,
      },
    });

    const button = wrapper.find('.calculate-btn');
    expect(button.attributes('disabled')).toBeDefined();
  });

  it('should enable calculate button when isValid is true', () => {
    const wrapper = mount(FormInputs, {
      props: defaultProps,
    });

    const button = wrapper.find('.calculate-btn');
    expect(button.attributes('disabled')).toBeUndefined();
  });

  it('should emit toggle-unit event when unit button is clicked', async () => {
    const wrapper = mount(FormInputs, {
      props: defaultProps,
    });

    const imperialButton = wrapper.findAll('.unit-btn')[1];
    await imperialButton.trigger('click');

    expect(wrapper.emitted('toggle-unit')).toBeTruthy();
    expect(wrapper.emitted('toggle-unit')).toHaveLength(1);
  });

  it('should emit calculate event when calculate button is clicked', async () => {
    const wrapper = mount(FormInputs, {
      props: defaultProps,
    });

    const button = wrapper.find('.calculate-btn');
    await button.trigger('click');

    expect(wrapper.emitted('calculate')).toBeTruthy();
    expect(wrapper.emitted('calculate')).toHaveLength(1);
  });

  it('should emit update events when inputs change', async () => {
    const wrapper = mount(FormInputs, {
      props: defaultProps,
    });

    const heightInput = wrapper.find('#height');
    await heightInput.setValue(190);

    expect(wrapper.emitted('update:height')).toBeTruthy();
    expect(wrapper.emitted('update:height')![0]).toEqual([190]);
  });

  it('should have proper ARIA labels', () => {
    const wrapper = mount(FormInputs, {
      props: defaultProps,
    });

    const heightInput = wrapper.find('#height');
    expect(heightInput.attributes('aria-describedby')).toBe('height-error');
  });
});

describe('ResultCard Component', () => {
  const mockResult: BmiResult = {
    bmi: 23.1,
    category: 'Normal',
    healthyWeightRange: {
      min: 59.9,
      max: 80.7,
    },
    guidance: 'Great! You\'re in a healthy weight range.',
    timestamp: new Date().toISOString(),
  };

  it('should display BMI value', () => {
    const wrapper = mount(ResultCard, {
      props: {
        result: mockResult,
        unitSystem: 'metric',
      },
    });

    expect(wrapper.text()).toContain('23.1');
    expect(wrapper.text()).toContain('BMI');
  });

  it('should display category badge', () => {
    const wrapper = mount(ResultCard, {
      props: {
        result: mockResult,
        unitSystem: 'metric',
      },
    });

    expect(wrapper.text()).toContain('Normal');
    expect(wrapper.find('.category-badge').exists()).toBe(true);
  });

  it('should display healthy weight range', () => {
    const wrapper = mount(ResultCard, {
      props: {
        result: mockResult,
        unitSystem: 'metric',
      },
    });

    expect(wrapper.text()).toContain('59.9');
    expect(wrapper.text()).toContain('80.7');
    expect(wrapper.text()).toContain('kg');
  });

  it('should display guidance message', () => {
    const wrapper = mount(ResultCard, {
      props: {
        result: mockResult,
        unitSystem: 'metric',
      },
    });

    expect(wrapper.text()).toContain('Great! You\'re in a healthy weight range.');
  });

  it('should display weight difference for non-normal categories', () => {
    const overweightResult: BmiResult = {
      bmi: 27.5,
      category: 'Overweight',
      healthyWeightRange: {
        min: 59.9,
        max: 80.7,
      },
      weightDifference: {
        amount: 5.2,
        direction: 'lose',
      },
      guidance: 'Consider adopting a healthier lifestyle.',
      timestamp: new Date().toISOString(),
    };

    const wrapper = mount(ResultCard, {
      props: {
        result: overweightResult,
        unitSystem: 'metric',
      },
    });

    expect(wrapper.text()).toContain('losing');
    expect(wrapper.text()).toContain('5.2');
  });

  it('should use correct unit for weight range (imperial)', () => {
    const wrapper = mount(ResultCard, {
      props: {
        result: mockResult,
        unitSystem: 'imperial',
      },
    });

    expect(wrapper.text()).toContain('lbs');
  });

  it('should render GaugeBar component', () => {
    const wrapper = mount(ResultCard, {
      props: {
        result: mockResult,
        unitSystem: 'metric',
      },
    });

    expect(wrapper.findComponent(GaugeBar).exists()).toBe(true);
  });
});

describe('HistoryList Component', () => {
  const mockHistory = [
    {
      bmi: 23.1,
      category: 'Normal',
      height: '180 cm',
      weight: '75 kg',
      unit: 'metric' as UnitSystem,
      healthyWeightRange: { min: 59.9, max: 80.7 },
      guidance: 'Great!',
      timestamp: new Date().toISOString(),
    },
    {
      bmi: 25.5,
      category: 'Overweight',
      height: '170 cm',
      weight: '85 kg',
      unit: 'metric' as UnitSystem,
      healthyWeightRange: { min: 53.5, max: 72.0 },
      weightDifference: { amount: 5.2, direction: 'lose' },
      guidance: 'Consider adopting a healthier lifestyle.',
      timestamp: new Date().toISOString(),
    },
  ];

  it('should display empty state when history is empty', () => {
    const wrapper = mount(HistoryList, {
      props: {
        history: [],
      },
    });

    expect(wrapper.text()).toContain('No calculations yet');
    expect(wrapper.find('.empty-state').exists()).toBe(true);
  });

  it('should display history items', () => {
    const wrapper = mount(HistoryList, {
      props: {
        history: mockHistory,
      },
    });

    expect(wrapper.findAll('.history-item')).toHaveLength(2);
    expect(wrapper.text()).toContain('23.1');
    expect(wrapper.text()).toContain('25.5');
  });

  it('should display BMI and category for each entry', () => {
    const wrapper = mount(HistoryList, {
      props: {
        history: mockHistory,
      },
    });

    expect(wrapper.text()).toContain('Normal');
    expect(wrapper.text()).toContain('Overweight');
  });

  it('should display height and weight for each entry', () => {
    const wrapper = mount(HistoryList, {
      props: {
        history: mockHistory,
      },
    });

    expect(wrapper.text()).toContain('180 cm');
    expect(wrapper.text()).toContain('75 kg');
  });

  it('should emit delete-entry event when delete button is clicked', async () => {
    const wrapper = mount(HistoryList, {
      props: {
        history: mockHistory,
      },
    });

    const deleteButtons = wrapper.findAll('.delete-btn');
    await deleteButtons[0].trigger('click');

    expect(wrapper.emitted('delete-entry')).toBeTruthy();
    expect(wrapper.emitted('delete-entry')![0]).toEqual([0]);
  });

  it('should emit clear-all event when clear button is clicked', async () => {
    const wrapper = mount(HistoryList, {
      props: {
        history: mockHistory,
      },
    });

    const clearButton = wrapper.find('.clear-btn');
    await clearButton.trigger('click');

    expect(wrapper.emitted('clear-all')).toBeTruthy();
  });

  it('should not show clear button when history is empty', () => {
    const wrapper = mount(HistoryList, {
      props: {
        history: [],
      },
    });

    expect(wrapper.find('.clear-btn').exists()).toBe(false);
  });

  it('should format dates correctly', () => {
    const wrapper = mount(HistoryList, {
      props: {
        history: mockHistory,
      },
    });

    // Date should be formatted
    const dateText = wrapper.text();
    expect(dateText).toMatch(/\w{3}\s+\d{1,2}/); // Format like "Jan 27"
  });
});

describe('ThemeToggle Component', () => {
  it('should render light theme icon when theme is light', () => {
    const wrapper = mount(ThemeToggle, {
      props: {
        theme: 'light',
      },
    });

    const svg = wrapper.find('svg');
    expect(svg.exists()).toBe(true);
  });

  it('should render dark theme icon when theme is dark', () => {
    const wrapper = mount(ThemeToggle, {
      props: {
        theme: 'dark',
      },
    });

    const svg = wrapper.find('svg');
    expect(svg.exists()).toBe(true);
  });

  it('should emit update:theme event when clicked', async () => {
    const wrapper = mount(ThemeToggle, {
      props: {
        theme: 'light',
      },
    });

    const button = wrapper.find('.theme-toggle');
    await button.trigger('click');

    expect(wrapper.emitted('update:theme')).toBeTruthy();
    expect(wrapper.emitted('update:theme')![0]).toEqual(['dark']);
  });

  it('should toggle theme correctly', async () => {
    const wrapper = mount(ThemeToggle, {
      props: {
        theme: 'light',
      },
    });

    const button = wrapper.find('.theme-toggle');
    await button.trigger('click');

    expect(wrapper.emitted('update:theme')![0]).toEqual(['dark']);

    await wrapper.setProps({ theme: 'dark' });
    await button.trigger('click');

    expect(wrapper.emitted('update:theme')![1]).toEqual(['light']);
  });

  it('should have proper ARIA label', () => {
    const wrapper = mount(ThemeToggle, {
      props: {
        theme: 'light',
      },
    });

    const button = wrapper.find('.theme-toggle');
    expect(button.attributes('aria-label')).toContain('dark');
  });
});

describe('GaugeBar Component', () => {
  it('should render gauge segments', () => {
    const wrapper = mount(GaugeBar, {
      props: {
        bmi: 23.1,
        position: 50,
      },
    });

    expect(wrapper.find('.gauge-track').exists()).toBe(true);
    expect(wrapper.findAll('.gauge-segment')).toHaveLength(4);
  });

  it('should display BMI value on marker', () => {
    const wrapper = mount(GaugeBar, {
      props: {
        bmi: 23.1,
        position: 50,
      },
    });

    expect(wrapper.text()).toContain('23.1');
  });

  it('should position marker correctly', () => {
    const wrapper = mount(GaugeBar, {
      props: {
        bmi: 20.0,
        position: 25,
      },
    });

    const marker = wrapper.find('.gauge-marker');
    const style = marker.attributes('style');
    expect(style).toContain('left: 25%');
  });

  it('should display gauge labels', () => {
    const wrapper = mount(GaugeBar, {
      props: {
        bmi: 23.1,
        position: 50,
      },
    });

    expect(wrapper.text()).toContain('15');
    expect(wrapper.text()).toContain('18.5');
    expect(wrapper.text()).toContain('25');
    expect(wrapper.text()).toContain('30');
    expect(wrapper.text()).toContain('40');
  });

  it('should have proper ARIA label', () => {
    const wrapper = mount(GaugeBar, {
      props: {
        bmi: 23.1,
        position: 50,
      },
    });

    const marker = wrapper.find('.gauge-marker');
    expect(marker.attributes('aria-label')).toContain('23.1');
  });

  it('should clamp position to 0-100 range', () => {
    const wrapper = mount(GaugeBar, {
      props: {
        bmi: 10.0,
        position: -10, // Should be clamped to 0
      },
    });

    const marker = wrapper.find('.gauge-marker');
    const style = marker.attributes('style');
    expect(style).toContain('left: 0%');
  });
});
