import AlertDispatcher from '../repository_after/alertDispatcher.js';

describe('AlertDispatcher', () => {
  test('debounce: three consecutive uses within 10 seconds should trigger only one alert', () => {
    const dispatcher = new AlertDispatcher();
    dispatcher.initializeChemical('Ethanol', 10.0, 5.0);

    dispatcher.notifyUsage('Ethanol', 2.0);
    dispatcher.notifyUsage('Ethanol', 2.0);
    dispatcher.notifyUsage('Ethanol', 2.0);

    const queue = dispatcher.getQueue();
    expect(queue.length).toBe(1);
    expect(queue[0].chemical).toBe('Ethanol');
  });

  test('multiple chemicals: both should be added to queue when below threshold', () => {
    const dispatcher = new AlertDispatcher();
    dispatcher.initializeChemical('Ethanol', 10.0, 5.0);
    dispatcher.initializeChemical('Polymerase', 8.0, 3.0);

    dispatcher.notifyUsage('Ethanol', 6.0);
    dispatcher.notifyUsage('Polymerase', 6.0);

    const queue = dispatcher.getQueue();
    expect(queue.length).toBe(2);
    expect(queue.find(a => a.chemical === 'Ethanol')).toBeDefined();
    expect(queue.find(a => a.chemical === 'Polymerase')).toBeDefined();
  });

  test('queue should clear after getQueue is called', () => {
    const dispatcher = new AlertDispatcher();
    dispatcher.initializeChemical('Ethanol', 10.0, 5.0);

    dispatcher.notifyUsage('Ethanol', 6.0);
    dispatcher.getQueue();
    
    const queue = dispatcher.getQueue();
    expect(queue.length).toBe(0);
  });

  test('stock cannot go negative', () => {
    const dispatcher = new AlertDispatcher();
    dispatcher.initializeChemical('Ethanol', 5.0, 2.0);

    dispatcher.notifyUsage('Ethanol', 10.0);
    
    expect(dispatcher.stock['Ethanol']).toBe(0);
  });
});
