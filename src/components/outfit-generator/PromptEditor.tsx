import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { debounce } from 'lodash';
import { useCallback, useEffect, useState } from 'react';
import { logger } from '@/lib/logger';

interface PromptEditorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const STORAGE_KEY = 'outfit_prompt_draft';

export const PromptEditor = ({ value, onChange, disabled = false }: PromptEditorProps) => {
  const [localValue, setLocalValue] = useState(value);

  // Load draft from localStorage on mount
  useEffect(() => {
    const draft = localStorage.getItem(STORAGE_KEY);
    if (draft && !value) {
      setLocalValue(draft);
      onChange(draft);
      logger.info('Loaded prompt draft from localStorage');
    }
  }, []);

  // Debounced save to localStorage
  const saveToLocalStorage = useCallback(
    debounce((text: string) => {
      if (text.trim()) {
        localStorage.setItem(STORAGE_KEY, text);
        logger.debug('Saved prompt draft to localStorage', { length: text.length });
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    }, 1000),
    []
  );

  // Debounced onChange callback
  const debouncedOnChange = useCallback(
    debounce((text: string) => {
      onChange(text);
    }, 300),
    [onChange]
  );

  const handleChange = (text: string) => {
    setLocalValue(text);
    debouncedOnChange(text);
    saveToLocalStorage(text);
  };

  // Sync external value changes
  useEffect(() => {
    if (value !== localValue) {
      setLocalValue(value);
    }
  }, [value]);

  return (
    <div className="space-y-2">
      <Label htmlFor="prompt-editor">Describe Your Outfit</Label>
      <Textarea
        id="prompt-editor"
        value={localValue}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="e.g., 'Formal office wear in blue tones' or 'Casual summer outfit for a picnic'"
        rows={3}
        disabled={disabled}
        aria-label="Outfit description"
      />
    </div>
  );
};
