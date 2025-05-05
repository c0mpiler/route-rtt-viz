/**
 * CustomSelect - A simple native select component replacement for react-select
 * This component avoids the Emotion CSS dependency issues
 */
import React from 'react';

interface Option {
  value: string;
  label: string;
  isDisabled?: boolean;
}

interface GroupedOption {
  label: string;
  options: Option[];
}

interface CustomSelectProps {
  value: string | null;
  onChange: (value: string) => void;
  options: GroupedOption[];
  placeholder?: string;
  className?: string;
  isDisabled?: boolean;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = "Select...",
  className = "",
  isDisabled = false,
}) => {
  return (
    <select
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      disabled={isDisabled}
      className={`w-full px-4 py-3 bg-white border border-slate-300 rounded-lg 
                  shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 
                  focus:border-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed
                  ${className}`}
    >
      <option value="" disabled hidden>
        {placeholder}
      </option>
      
      {options.map((group, groupIndex) => (
        <optgroup key={groupIndex} label={group.label}>
          {group.options.map((option, optionIndex) => (
            <option
              key={`${groupIndex}-${optionIndex}`}
              value={option.value}
              disabled={option.isDisabled}
            >
              {option.label}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
};
