import { describe, it, expect } from 'vitest';
import {
  FLOWCHART_NODE_TYPES,
  BASIC_TOOLBAR_TYPES,
  ADVANCED_PALETTE_TYPES,
  BPMN_PALETTE_TYPES,
} from './flowchart';

describe('flowchart types', () => {
  it('exports all expected node types', () => {
    expect(FLOWCHART_NODE_TYPES).toContain('process');
    expect(FLOWCHART_NODE_TYPES).toContain('decision');
    expect(FLOWCHART_NODE_TYPES).toContain('terminal');
    expect(FLOWCHART_NODE_TYPES).toContain('gateway');
  });

  it('basic toolbar contains the four primary symbols', () => {
    expect(BASIC_TOOLBAR_TYPES).toEqual(['terminal', 'process', 'decision', 'data']);
  });

  it('advanced and BPMN palettes are non-empty', () => {
    expect(ADVANCED_PALETTE_TYPES.length).toBeGreaterThan(0);
    expect(BPMN_PALETTE_TYPES.length).toBeGreaterThan(0);
  });
});
