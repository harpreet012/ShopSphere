import { useRef, useState } from 'react';

/**
 * 6-digit OTP input component.
 * Renders 6 individual boxes; supports paste, backspace navigation.
 */
const OTPInput = ({ value, onChange, disabled }) => {
  const inputs = useRef([]);
  const digits = value.split('').concat(Array(6).fill('')).slice(0, 6);

  const update = (index, char) => {
    const next = digits.slice();
    next[index] = char.replace(/\D/g, '').slice(-1);
    onChange(next.join(''));
    if (char && index < 5) inputs.current[index + 1]?.focus();
  };

  const handleKey = (e, index) => {
    if (e.key === 'Backspace') {
      if (digits[index]) {
        update(index, '');
      } else if (index > 0) {
        inputs.current[index - 1]?.focus();
        update(index - 1, '');
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    onChange(pasted.padEnd(6, '').slice(0, 6));
    const nextFocus = Math.min(pasted.length, 5);
    inputs.current[nextFocus]?.focus();
  };

  return (
    <div className="flex gap-2 justify-center">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => (inputs.current[i] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          disabled={disabled}
          onChange={(e) => update(i, e.target.value)}
          onKeyDown={(e) => handleKey(e, i)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          className="w-11 h-12 text-center text-xl font-bold border-2 rounded-lg outline-none
            border-gray-300 focus:border-blue-500 transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed bg-white"
          aria-label={`OTP digit ${i + 1}`}
        />
      ))}
    </div>
  );
};

export default OTPInput;
