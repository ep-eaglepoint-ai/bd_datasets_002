import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import App from '../repository_after/src/App.vue';
 
describe('BMI Calculator - Integration Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('Complete Calculation Flow', () => {
    it('should calculate BMI and display result (metric)', async () => {
      const wrapper = mount(App);
      
      // Wait for component to mount
      await nextTick();
      
      // Find form inputs
      const heightInput = wrapper.find('#height');
      const weightInput = wrapper.find('#weight');
      const calculateButton = wrapper.find('.calculate-btn');
      
      // Set values
      await heightInput.setValue(180);
      await weightInput.setValue(75);
      await nextTick();
      
      // Click calculate
      await calculateButton.trigger('click');
      await nextTick();
      
      // Verify result is displayed
      expect(wrapper.text()).toContain('23.1');
      expect(wrapper.text()).toContain('Normal');
      expect(wrapper.find('.result-card').exists()).toBe(true);
    });

    it('should calculate BMI and display result (imperial)', async () => {
      const wrapper = mount(App);
      await nextTick();
      
      // Switch to imperial
      const imperialButton = wrapper.findAll('.unit-btn')[1];
      await imperialButton.trigger('click');
      await nextTick();
      
      // Set imperial values
      const feetInput = wrapper.find('#height-feet');
      const inchesInput = wrapper.find('#height-inches');
      const weightInput = wrapper.find('#weight');
      
      await feetInput.setValue(5);
      await inchesInput.setValue(10);
      await weightInput.setValue(154);
      await nextTick();
      
      // Calculate
      const calculateButton = wrapper.find('.calculate-btn');
      await calculateButton.trigger('click');
      await nextTick();
      
      // Verify result
      expect(wrapper.find('.result-card').exists()).toBe(true);
      expect(wrapper.text()).toContain('BMI');
    });

    it('should add calculation to history', async () => {
      const wrapper = mount(App);
      await nextTick();
      
      // Perform calculation
      const heightInput = wrapper.find('#height');
      const weightInput = wrapper.find('#weight');
      await heightInput.setValue(180);
      await weightInput.setValue(75);
      await nextTick();
      
      const calculateButton = wrapper.find('.calculate-btn');
      await calculateButton.trigger('click');
      await nextTick();
      
      // Check history
      expect(wrapper.text()).toContain('Calculation History');
      expect(wrapper.findAll('.history-item').length).toBeGreaterThan(0);
    });

    it('should limit history to 10 entries', async () => {
      const wrapper = mount(App);
      await nextTick();
      
      const heightInput = wrapper.find('#height');
      const weightInput = wrapper.find('#weight');
      const calculateButton = wrapper.find('.calculate-btn');
      
      // Perform 12 calculations
      for (let i = 0; i < 12; i++) {
        await heightInput.setValue(180);
        await weightInput.setValue(75 + i);
        await nextTick();
        await calculateButton.trigger('click');
        await nextTick();
      }
      
      // History should be limited to 10
      const historyItems = wrapper.findAll('.history-item');
      expect(historyItems.length).toBeLessThanOrEqual(10);
    });
  });

  describe('Unit Conversion Integration', () => {
    it('should convert values when toggling units', async () => {
      const wrapper = mount(App);
      await nextTick();
      
      // Set metric values
      const heightInput = wrapper.find('#height');
      const weightInput = wrapper.find('#weight');
      await heightInput.setValue(180);
      await weightInput.setValue(75);
      await nextTick();
      
      // Toggle to imperial
      const imperialButton = wrapper.findAll('.unit-btn')[1];
      await imperialButton.trigger('click');
      await nextTick();
      
      // Values should be converted
      const feetInput = wrapper.find('#height-feet');
      const inchesInput = wrapper.find('#height-inches');
      
      expect(feetInput.element.value).toBeTruthy();
      expect(inchesInput.element.value).toBeTruthy();
    });

    it('should maintain calculation accuracy after unit conversion', async () => {
      const wrapper = mount(App);
      await nextTick();
      
      // Calculate in metric
      const heightInput = wrapper.find('#height');
      const weightInput = wrapper.find('#weight');
      await heightInput.setValue(180);
      await weightInput.setValue(75);
      await nextTick();
      
      const calculateButton = wrapper.find('.calculate-btn');
      await calculateButton.trigger('click');
      await nextTick();
      
      const metricBmi = wrapper.text().match(/(\d+\.\d+)\s*BMI/)?.[1];
      
      // Convert to imperial and calculate again
      const imperialButton = wrapper.findAll('.unit-btn')[1];
      await imperialButton.trigger('click');
      await nextTick();
      
      await calculateButton.trigger('click');
      await nextTick();
      
      const imperialBmi = wrapper.text().match(/(\d+\.\d+)\s*BMI/)?.[1];
      
      // BMI should be approximately the same
      if (metricBmi && imperialBmi) {
        const diff = Math.abs(parseFloat(metricBmi) - parseFloat(imperialBmi));
        expect(diff).toBeLessThan(0.5);
      }
    });
  });

  describe('Input Validation Integration', () => {
    it('should prevent calculation with invalid inputs', async () => {
      const wrapper = mount(App);
      await nextTick();
      
      const heightInput = wrapper.find('#height');
      const weightInput = wrapper.find('#weight');
      const calculateButton = wrapper.find('.calculate-btn');
      
      // Set invalid height
      await heightInput.setValue(10); // Too small
      await weightInput.setValue(75);
      await nextTick();
      
      // Button should be disabled
      expect(calculateButton.attributes('disabled')).toBeDefined();
      
      // Error message should be displayed
      expect(wrapper.text()).toContain('Height must be between');
    });

    it('should clear errors when valid inputs are provided', async () => {
      const wrapper = mount(App);
      await nextTick();
      
      const heightInput = wrapper.find('#height');
      const weightInput = wrapper.find('#weight');
      
      // Set invalid values
      await heightInput.setValue(10);
      await weightInput.setValue(75);
      await nextTick();
      
      // Set valid values
      await heightInput.setValue(180);
      await nextTick();
      
      // Error should be cleared
      const errorMessage = wrapper.find('.error-message');
      expect(errorMessage.exists()).toBe(false);
    });
  });

  describe('LocalStorage Persistence Integration', () => {
    it('should persist theme preference', async () => {
      const wrapper = mount(App);
      await nextTick();
      
      const themeToggle = wrapper.find('.theme-toggle');
      await themeToggle.trigger('click');
      await nextTick();
      
      // Check localStorage
      const savedTheme = localStorage.getItem('bmi_theme');
      expect(savedTheme).toBe(JSON.stringify('dark'));
    });

    it('should persist input values', async () => {
      const wrapper = mount(App);
      await nextTick();
      
      const heightInput = wrapper.find('#height');
      const weightInput = wrapper.find('#weight');
      
      await heightInput.setValue(180);
      await weightInput.setValue(75);
      await nextTick();
      
      // Wait for watcher
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const savedInputs = localStorage.getItem('bmi_inputs');
      expect(savedInputs).toBeTruthy();
      
      if (savedInputs) {
        const parsed = JSON.parse(savedInputs);
        expect(parsed.height).toBe(180);
        expect(parsed.weight).toBe(75);
      }
    });

    it('should restore values from localStorage on mount', async () => {
      // Set up localStorage
      localStorage.setItem('bmi_inputs', JSON.stringify({
        unitSystem: 'metric',
        height: 180,
        weight: 75,
        heightFeet: null,
        heightInches: null,
      }));
      
      const wrapper = mount(App);
      await nextTick();
      
      const heightInput = wrapper.find('#height');
      expect(heightInput.element.value).toBe('180');
    });

    it('should persist calculation history', async () => {
      const wrapper = mount(App);
      await nextTick();
      
      // Perform calculation
      const heightInput = wrapper.find('#height');
      const weightInput = wrapper.find('#weight');
      await heightInput.setValue(180);
      await weightInput.setValue(75);
      await nextTick();
      
      const calculateButton = wrapper.find('.calculate-btn');
      await calculateButton.trigger('click');
      await nextTick();
      
      // Wait for persistence
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const savedHistory = localStorage.getItem('bmi_history');
      expect(savedHistory).toBeTruthy();
      
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory);
        expect(parsed).toHaveLength(1);
        expect(parsed[0].bmi).toBe(23.1);
      }
    });
  });

  describe('History Management Integration', () => {
    it('should delete individual history entries', async () => {
      const wrapper = mount(App);
      await nextTick();
      
      // Add two calculations
      const heightInput = wrapper.find('#height');
      const weightInput = wrapper.find('#weight');
      const calculateButton = wrapper.find('.calculate-btn');
      
      await heightInput.setValue(180);
      await weightInput.setValue(75);
      await calculateButton.trigger('click');
      await nextTick();
      
      await weightInput.setValue(80);
      await calculateButton.trigger('click');
      await nextTick();
      
      // Delete first entry
      const deleteButtons = wrapper.findAll('.delete-btn');
      await deleteButtons[0].trigger('click');
      await nextTick();
      
      // Should have one less entry
      const historyItems = wrapper.findAll('.history-item');
      expect(historyItems.length).toBe(1);
    });

    it('should clear all history', async () => {
      const wrapper = mount(App);
      await nextTick();
      
      // Add calculations
      const heightInput = wrapper.find('#height');
      const weightInput = wrapper.find('#weight');
      const calculateButton = wrapper.find('.calculate-btn');
      
      for (let i = 0; i < 3; i++) {
        await heightInput.setValue(180);
        await weightInput.setValue(75 + i);
        await calculateButton.trigger('click');
        await nextTick();
      }
      
      // Clear all
      const clearButton = wrapper.find('.clear-btn');
      await clearButton.trigger('click');
      await nextTick();
      
      // History should be empty
      expect(wrapper.text()).toContain('No calculations yet');
    });
  });

  describe('Theme Toggle Integration', () => {
    it('should toggle theme and persist preference', async () => {
      const wrapper = mount(App);
      await nextTick();
      
      const themeToggle = wrapper.find('.theme-toggle');
      
      // Toggle to dark
      await themeToggle.trigger('click');
      await nextTick();
      
      // Check document attribute
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      
      // Toggle back to light
      await themeToggle.trigger('click');
      await nextTick();
      
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });
  });

  describe('Adversarial Integration Scenarios', () => {
    it('should handle rapid unit toggling', async () => {
      const wrapper = mount(App);
      await nextTick();
      
      const heightInput = wrapper.find('#height');
      const weightInput = wrapper.find('#weight');
      await heightInput.setValue(180);
      await weightInput.setValue(75);
      await nextTick();
      
      // Toggle rapidly
      const metricButton = wrapper.findAll('.unit-btn')[0];
      const imperialButton = wrapper.findAll('.unit-btn')[1];
      
      for (let i = 0; i < 5; i++) {
        await imperialButton.trigger('click');
        await nextTick();
        await metricButton.trigger('click');
        await nextTick();
      }
      
      // Should still work
      const calculateButton = wrapper.find('.calculate-btn');
      expect(calculateButton.exists()).toBe(true);
    });

    it('should handle multiple rapid calculations', async () => {
      const wrapper = mount(App);
      await nextTick();
      
      const heightInput = wrapper.find('#height');
      const weightInput = wrapper.find('#weight');
      const calculateButton = wrapper.find('.calculate-btn');
      
      await heightInput.setValue(180);
      
      // Rapid calculations with different weights
      for (let i = 0; i < 5; i++) {
        await weightInput.setValue(70 + i);
        await calculateButton.trigger('click');
        await nextTick();
      }
      
      // Should have results
      expect(wrapper.findAll('.history-item').length).toBeGreaterThan(0);
    });

    it('should handle localStorage corruption gracefully', async () => {
      // Set invalid JSON in localStorage
      localStorage.setItem('bmi_inputs', 'invalid json{');
      localStorage.setItem('bmi_history', 'not json');
      
      const wrapper = mount(App);
      await nextTick();
      
      // Should not crash
      expect(wrapper.find('.form-inputs').exists()).toBe(true);
    });
  });
});
