import { useId } from 'react';
import styles from './OptionPicker.module.css';

export interface PickerOption {
  value: string;
  label: string;
  disabled?: boolean;
  swatch?: string;
}

interface OptionPickerProps {
  legend: string;
  options: PickerOption[];
  value: string;
  onChange: (value: string) => void;
  disabledSuffix?: string;
}

export function OptionPicker({ legend, options, value, onChange, disabledSuffix }: OptionPickerProps) {
  const name = useId();
  const usesSwatches = options.some((option) => option.swatch);

  return (
    <fieldset className={styles.picker}>
      <legend className={styles.legend}>
        {legend}
        <span className={styles.current}>{options.find((option) => option.value === value)?.label}</span>
      </legend>
      <div className={styles.options}>
        {options.map((option) => (
          <label
            key={option.value}
            className={`${styles.option} ${usesSwatches ? styles.swatchOption : ''}`}
            data-disabled={option.disabled || undefined}
          >
            <input
              className="visually-hidden"
              type="radio"
              name={name}
              value={option.value}
              checked={option.value === value}
              disabled={option.disabled}
              onChange={() => onChange(option.value)}
            />
            {option.swatch ? (
              <span className={styles.swatch} style={{ background: option.swatch }} aria-hidden="true" />
            ) : (
              <span className={styles.text}>{option.label}</span>
            )}
            {option.swatch && <span className="visually-hidden">{option.label}</span>}
            {option.disabled && disabledSuffix && <span className="visually-hidden">{disabledSuffix}</span>}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
