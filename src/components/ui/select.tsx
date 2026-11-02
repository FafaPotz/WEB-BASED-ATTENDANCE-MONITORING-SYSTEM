import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '../../lib/utils.ts';

function extractText(node: React.ReactNode): string {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (React.isValidElement(node) && (node.props as any)?.children) {
    return extractText((node.props as any).children);
  }
  return '';
}

interface SelectContextType {
  value: string;
  onValueChange: (val: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  selectedLabel: string;
  setSelectedLabel: (label: string) => void;
}

const SelectContext = createContext<SelectContextType>({
  value: '',
  onValueChange: () => {},
  open: false,
  setOpen: () => {},
  selectedLabel: '',
  setSelectedLabel: () => {}
});

export const Select: React.FC<{
  value?: string;
  onValueChange?: (val: string) => void;
  defaultValue?: string;
  children: React.ReactNode;
}> = ({ value: controlledValue, onValueChange, defaultValue = '', children }) => {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState('');

  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : internalValue;

  const handleValueChange = (newVal: string) => {
    if (!isControlled) {
      setInternalValue(newVal);
    }
    onValueChange?.(newVal);
    setOpen(false);
  };

  return (
    <SelectContext.Provider
      value={{
        value,
        onValueChange: handleValueChange,
        open,
        setOpen,
        selectedLabel,
        setSelectedLabel
      }}
    >
      <div className="relative w-full inline-block text-left">{children}</div>
    </SelectContext.Provider>
  );
};

export const SelectTrigger: React.FC<{
  className?: string;
  children?: React.ReactNode;
  'data-testid'?: string;
}> = ({ className, children, 'data-testid': testId }) => {
  const { open, setOpen } = useContext(SelectContext);
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <button
      ref={triggerRef}
      type="button"
      data-testid={testId}
      onClick={() => setOpen(!open)}
      className={cn(
        'flex h-10 w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 transition-colors',
        className
      )}
      aria-expanded={open}
    >
      {children}
      <ChevronDown className={cn("h-4 w-4 opacity-70 transition-transform duration-200 shrink-0 ml-2", open && "rotate-180")} />
    </button>
  );
};

export const SelectValue: React.FC<{
  placeholder?: string;
  children?: React.ReactNode;
}> = ({ placeholder, children }) => {
  const { value, selectedLabel } = useContext(SelectContext);
  const display = children !== undefined ? children : (selectedLabel || value || placeholder);
  return (
    <span className={cn('truncate text-left flex-1', !value && !children && 'text-slate-400')}>
      {display}
    </span>
  );
};

export const SelectContent: React.FC<{
  className?: string;
  children: React.ReactNode;
}> = ({ className, children }) => {
  const { open, setOpen } = useContext(SelectContext);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contentRef.current && !contentRef.current.closest('.relative')?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, setOpen]);

  if (!open) return null;

  return (
    <div
      ref={contentRef}
      className={cn(
        'absolute left-0 top-[calc(100%+4px)] z-50 min-w-[8rem] w-full rounded-xl border border-slate-200 bg-white p-1 text-slate-900 shadow-xl max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100',
        className
      )}
    >
      {children}
    </div>
  );
};

export const SelectItem: React.FC<{
  value: string;
  className?: string;
  children: React.ReactNode;
}> = ({ value: itemValue, className, children }) => {
  const { value, onValueChange, setSelectedLabel } = useContext(SelectContext);
  const isSelected = value === itemValue;

  useEffect(() => {
    if (isSelected) {
      const text = extractText(children);
      if (text) {
        setSelectedLabel(text);
      }
    }
  }, [isSelected, children, setSelectedLabel]);

  return (
    <div
      role="option"
      aria-selected={isSelected}
      onClick={() => {
        const text = extractText(children);
        if (text) {
          setSelectedLabel(text);
        }
        onValueChange(itemValue);
      }}
      className={cn(
        'relative flex w-full cursor-pointer select-none items-center rounded-lg py-2 pl-8 pr-3 text-sm text-slate-700 outline-none hover:bg-emerald-50 hover:text-emerald-900 transition-colors',
        isSelected && 'bg-emerald-50 text-emerald-900 font-semibold',
        className
      )}
    >
      {isSelected && (
        <span className="absolute left-2.5 flex h-3.5 w-3.5 items-center justify-center">
          <Check className="h-4 w-4 text-emerald-600" />
        </span>
      )}
      <span className="truncate">{children}</span>
    </div>
  );
};
