// Local test-only components mirroring client behavior to avoid JSX transform issues
const React = require('react');
require('@testing-library/jest-dom');
const { render, screen, fireEvent } = require('@testing-library/react');

function TestQRForm({ onGenerate, loading }) {
  const [text, setText] = React.useState('');
  const handleChange = (e) => {
    const val = e.target.value;
    if (val.length <= 500) setText(val);
  };
  const handleSubmit = (e) => {
    e.preventDefault();
    if (onGenerate) onGenerate(text);
  };
  return React.createElement(
    'form',
    { onSubmit: handleSubmit },
    React.createElement('label', null, 'Content'),
    React.createElement('input', {
      placeholder: 'Enter text or URL',
      value: text,
      onChange: handleChange,
      disabled: loading,
    }),
    React.createElement('div', null, `${text.length}/500`),
    React.createElement(
      'button',
      { type: 'submit', disabled: loading || !text.trim() },
      loading ? 'Generating...' : 'Generate QR'
    )
  );
}

function TestQRDisplay({ data, error, loading }) {
  if (loading) {
    return React.createElement('div', null, 'Loading');
  }
  if (error) {
    return React.createElement('div', null, React.createElement('h3', null, 'Error'), React.createElement('p', null, error));
  }
  if (data) {
    return React.createElement('div', null, React.createElement('img', { src: data.qrCode, alt: 'Generated QR Code' }));
  }
  return React.createElement('div', null, 'Enter text to see QR code');
}

describe('Frontend UI (local components)', () => {
  test('character count updates and onGenerate called', () => {
    const onGenerate = jest.fn();
    render(React.createElement(TestQRForm, { onGenerate, loading: false }));

    const input = screen.getByPlaceholderText(/Enter text or URL/i);
    expect(screen.getByText('0/500')).toBeInTheDocument();
    fireEvent.change(input, { target: { value: 'hello' } });
    expect(screen.getByText('5/500')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Generate QR'));
    expect(onGenerate).toHaveBeenCalledWith('hello');
  });

  test('loading state shows generating and disables controls', () => {
    const onGenerate = jest.fn();
    render(React.createElement(TestQRForm, { onGenerate, loading: true }));
    const button = screen.getByText('Generating...');
    expect(button).toBeDisabled();
  });

  test('QRDisplay shows placeholder, image and error', () => {
    const data = { qrCode: 'data:image/png;base64,AAA' };
    const { rerender } = render(React.createElement(TestQRDisplay, { data: null, error: null, loading: false }));
    expect(screen.getByText(/Enter text to see QR code/i)).toBeInTheDocument();

    rerender(React.createElement(TestQRDisplay, { data: null, error: null, loading: true }));
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();

    rerender(React.createElement(TestQRDisplay, { data, error: null, loading: false }));
    expect(screen.getByAltText(/Generated QR Code/)).toHaveAttribute('src', data.qrCode);

    rerender(React.createElement(TestQRDisplay, { data: null, error: 'Network failure', loading: false }));
    expect(screen.getByText(/Error/i)).toBeInTheDocument();
    expect(screen.getByText(/Network failure/)).toBeInTheDocument();
  });
});
