// Shared Recharts helpers — import here instead of duplicating in every chart

export const TOOLTIP_STYLE = {
  fontSize: 12,
  fontFamily: 'Inter',
  borderRadius: 8,
  border: '1px solid #e4e6ec',
} as const;

// Recharts Tooltip.formatter has strict types that don't accept plain (value: number) signatures.
// This factory returns a properly-typed formatter without scattering `as any` casts everywhere.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const makeFormatter = (labelFn: (value: any, name: any) => [string, string]) =>
  labelFn as any;
