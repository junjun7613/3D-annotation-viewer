// FILE: SwitchButton.tsx
import React from 'react';

interface SwitchButtonProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const SwitchButton: React.FC<SwitchButtonProps> = ({ checked, onChange }) => {
  return (
    <div
      style={{ backgroundColor: 'rgba(255, 255, 255, 0.7)', padding: '10px', borderRadius: '5px' }}
    >
      <label className="switch">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="slider round"></span>
      </label>
      <style jsx>{`
        .switch {
          position: relative;
          display: inline-block;
          width: 60px;
          height: 34px;
        }

        .switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #ccc;
          transition: 0.4s;
          border-radius: 34px;
        }

        .slider:before {
          position: absolute;
          content: '';
          height: 26px;
          width: 26px;
          left: 4px;
          bottom: 4px;
          background-color: white;
          transition: 0.4s;
          border-radius: 50%;
        }

        input:checked + .slider {
          background-color: #2196f3;
        }

        input:checked + .slider:before {
          transform: translateX(26px);
        }
      `}</style>
    </div>
  );
};

export default SwitchButton;
