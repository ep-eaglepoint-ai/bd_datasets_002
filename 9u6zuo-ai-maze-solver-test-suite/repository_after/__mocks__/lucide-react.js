// __mocks__/lucide-react.js
const React = require('react');

module.exports = {
  Play: () => React.createElement('span', { 'data-testid': 'play-icon' }, 'Play'),
  Pause: () => React.createElement('span', { 'data-testid': 'pause-icon' }, 'Pause'),
  RotateCcw: () => React.createElement('span', { 'data-testid': 'rotate-icon' }, 'Rotate'),
  Zap: () => React.createElement('span', { 'data-testid': 'zap-icon' }, 'Zap'),
  Brain: () => React.createElement('span', { 'data-testid': 'brain-icon' }, 'Brain'),
  Trophy: () => React.createElement('span', { 'data-testid': 'trophy-icon' }, 'Trophy'),
};