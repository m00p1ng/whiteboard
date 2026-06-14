import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Input } from './input';
import { Label } from './label';
import { Textarea } from './textarea';

describe('shadcn form controls', () => {
  it('associates a label with an input', () => {
    render(
      <>
        <Label htmlFor="width">Width</Label>
        <Input id="width" defaultValue="100" />
      </>
    );

    expect(screen.getByLabelText('Width')).toHaveValue('100');
  });

  it('merges custom classes into input and textarea styles', () => {
    render(
      <>
        <Input aria-label="Name" className="custom-input" />
        <Textarea aria-label="Description" className="custom-textarea" />
      </>
    );

    expect(screen.getByLabelText('Name')).toHaveClass(
      'border-input',
      'custom-input'
    );
    expect(screen.getByLabelText('Description')).toHaveClass(
      'border-input',
      'custom-textarea'
    );
  });
});
