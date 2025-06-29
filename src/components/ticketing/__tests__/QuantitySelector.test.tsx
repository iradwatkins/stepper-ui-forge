import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuantitySelector } from '../QuantitySelector';

const defaultProps = {
  value: 0,
  onChange: jest.fn(),
  min: 0,
  max: 10,
  disabled: false,
};

describe('QuantitySelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with initial value', () => {
    render(<QuantitySelector {...defaultProps} value={3} />);
    
    const input = screen.getByDisplayValue('3');
    expect(input).toBeInTheDocument();
  });

  it('calls onChange when increment button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnChange = jest.fn();
    
    render(<QuantitySelector {...defaultProps} onChange={mockOnChange} />);
    
    const incrementButton = screen.getByLabelText('Increase quantity');
    await user.click(incrementButton);
    
    expect(mockOnChange).toHaveBeenCalledWith(1);
  });

  it('calls onChange when decrement button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnChange = jest.fn();
    
    render(<QuantitySelector {...defaultProps} value={3} onChange={mockOnChange} />);
    
    const decrementButton = screen.getByLabelText('Decrease quantity');
    await user.click(decrementButton);
    
    expect(mockOnChange).toHaveBeenCalledWith(2);
  });

  it('disables decrement button when at minimum', () => {
    render(<QuantitySelector {...defaultProps} value={0} min={0} />);
    
    const decrementButton = screen.getByLabelText('Decrease quantity');
    expect(decrementButton).toBeDisabled();
  });

  it('disables increment button when at maximum', () => {
    render(<QuantitySelector {...defaultProps} value={10} max={10} />);
    
    const incrementButton = screen.getByLabelText('Increase quantity');
    expect(incrementButton).toBeDisabled();
  });

  it('allows direct input of valid numbers', async () => {
    const user = userEvent.setup();
    const mockOnChange = jest.fn();
    
    render(<QuantitySelector {...defaultProps} onChange={mockOnChange} />);
    
    const input = screen.getByLabelText('Quantity');
    await user.clear(input);
    await user.type(input, '5');
    
    expect(mockOnChange).toHaveBeenCalledWith(5);
  });

  it('ignores invalid input values', async () => {
    const user = userEvent.setup();
    const mockOnChange = jest.fn();
    
    render(<QuantitySelector {...defaultProps} value={3} onChange={mockOnChange} />);
    
    const input = screen.getByLabelText('Quantity');
    await user.clear(input);
    await user.type(input, 'abc');
    
    // Should not call onChange for invalid input
    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('resets to current value on blur if input is invalid', async () => {
    const user = userEvent.setup();
    
    render(<QuantitySelector {...defaultProps} value={3} />);
    
    const input = screen.getByLabelText('Quantity');
    await user.clear(input);
    await user.type(input, '15'); // Above max
    await user.tab(); // Trigger blur
    
    expect(input).toHaveValue('3'); // Should reset to current value
  });

  it('prevents input above maximum', async () => {
    const user = userEvent.setup();
    const mockOnChange = jest.fn();
    
    render(<QuantitySelector {...defaultProps} max={5} onChange={mockOnChange} />);
    
    const input = screen.getByLabelText('Quantity');
    await user.clear(input);
    await user.type(input, '10');
    
    // Should not call onChange for value above max
    expect(mockOnChange).not.toHaveBeenCalledWith(10);
  });

  it('prevents input below minimum', async () => {
    const user = userEvent.setup();
    const mockOnChange = jest.fn();
    
    render(<QuantitySelector {...defaultProps} min={1} onChange={mockOnChange} />);
    
    const input = screen.getByLabelText('Quantity');
    await user.clear(input);
    await user.type(input, '0');
    
    // Should not call onChange for value below min
    expect(mockOnChange).not.toHaveBeenCalledWith(0);
  });

  it('disables all controls when disabled prop is true', () => {
    render(<QuantitySelector {...defaultProps} disabled={true} />);
    
    const input = screen.getByLabelText('Quantity');
    const incrementButton = screen.getByLabelText('Increase quantity');
    const decrementButton = screen.getByLabelText('Decrease quantity');
    
    expect(input).toBeDisabled();
    expect(incrementButton).toBeDisabled();
    expect(decrementButton).toBeDisabled();
  });

  it('accepts custom min and max values', () => {
    render(<QuantitySelector {...defaultProps} min={5} max={15} value={10} />);
    
    const input = screen.getByLabelText('Quantity');
    expect(input).toHaveAttribute('min', '5');
    expect(input).toHaveAttribute('max', '15');
  });

  it('updates input value when prop value changes', () => {
    const { rerender } = render(<QuantitySelector {...defaultProps} value={3} />);
    
    let input = screen.getByDisplayValue('3');
    expect(input).toBeInTheDocument();
    
    rerender(<QuantitySelector {...defaultProps} value={7} />);
    
    input = screen.getByDisplayValue('7');
    expect(input).toBeInTheDocument();
  });
});