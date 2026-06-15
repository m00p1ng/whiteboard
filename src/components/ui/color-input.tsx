import { Input } from '@/components/ui/input';

interface ColorInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
}

export function ColorInput({ id, value, onChange }: ColorInputProps) {
  return (
    <div className="flex items-center gap-2">
      <input
        id={id}
        type="color"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-9 shrink-0 cursor-pointer rounded border border-input bg-transparent p-1"
      />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="font-mono text-xs uppercase"
      />
    </div>
  );
}
