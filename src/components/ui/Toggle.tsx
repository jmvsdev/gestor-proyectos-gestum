interface ToggleProps {
  checked: boolean;
  onChange: () => void;
  accentColor: string;
}

export function Toggle({ checked, onChange, accentColor }: ToggleProps) {
  return (
    <button
      onClick={onChange}
      role="switch"
      aria-checked={checked}
      className="relative inline-flex items-center w-10 h-6 rounded-full transition-colors duration-150 focus:outline-none"
      style={{ background: checked ? accentColor : '#cfd3dc' }}
    >
      <span
        className="absolute w-5 h-5 bg-white rounded-full shadow transition-transform duration-150"
        style={{ transform: checked ? 'translateX(18px)' : 'translateX(2px)' }}
      />
    </button>
  );
}
