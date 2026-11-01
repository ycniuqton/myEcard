/** Design scale: named tokens for every dimension, weight and spacing used by the UI. */

export enum FontWeight {
  Regular = 400,
  Medium = 500,
  Semibold = 600,
  Bold = 700,
}

export enum Radius {
  R3 = 3,
  R4 = 4,
  R7 = 7,
  R8 = 8,
  R10 = 10,
  R12 = 12,
  R16 = 16,
  R48 = 48,
  Pill = 999,
}

export enum Gap {
  G4 = 4,
  G5 = 5,
  G6 = 6,
  G7 = 7,
  G8 = 8,
  G10 = 10,
  G12 = 12,
  G14 = 14,
  G16 = 16,
  G20 = 20,
  G22 = 22,
  G24 = 24,
}

export enum Size {
  SN10 = -10,
  S3 = 3,
  S4 = 4,
  S5 = 5,
  S6 = 6,
  S8 = 8,
  S10 = 10,
  S11 = 11,
  S12 = 12,
  S16 = 16,
  S17 = 17,
  S18 = 18,
  S20 = 20,
  S24 = 24,
  S25 = 25,
  S26 = 26,
  S28 = 28,
  S32 = 32,
  S34 = 34,
  S36 = 36,
  S40 = 40,
  S44 = 44,
  S48 = 48,
  S52 = 52,
  S56 = 56,
  S60 = 60,
  S64 = 64,
  S66 = 66,
  S80 = 80,
  S84 = 84,
  S92 = 92,
  S160 = 160,
  S390 = 390,
}

export enum Layer {
  L4 = 4,
  L5 = 5,
}

export enum Stroke {
  W1_6 = 1.6,
  W1_8 = 1.8,
  W1_9 = 1.9,
  W2_4 = 2.4,
}

export enum Alpha {
  A0_85 = 0.85,
}

export enum FontSize {
  F10 = 10,
  F11 = 11,
  F12 = 12,
  F13 = 13,
  F14 = 14,
  F15 = 15,
  F16 = 16,
  F17 = 17,
  F18 = 18,
  F20 = 20,
  F22 = 22,
  F26 = 26,
  F28 = 28,
  F30 = 30,
  F34 = 34,
  F40 = 40,
  F44 = 44,
  F48 = 48,
}

export enum Leading {
  L12 = 12,
  L18 = 18,
  L19 = 19,
  L20 = 20,
  L22 = 22,
  L26 = 26,
  L28 = 28,
  L32 = 32,
  L34 = 34,
  L36 = 36,
  L38 = 38,
  L40 = 40,
  L48 = 48,
  L52 = 52,
  L56 = 56,
}

/** Shorthand padding and margin values as CSS strings. */
export class Inset {
  static readonly I0_10 = '0 10px'
  static readonly I0_10_0_8 = '0 10px 0 8px'
  static readonly I0_12_0_10 = '0 12px 0 10px'
  static readonly I0_14 = '0 14px'
  static readonly I0_20 = '0 20px'
  static readonly I0_20_0_10 = '0 20px 0 10px'
  static readonly I0_20_12 = '0 20px 12px'
  static readonly I0_20_20 = '0 20px 20px'
  static readonly I0_30_0_42 = '0 30px 0 42px'
  static readonly I0_4 = '0 4px'
  static readonly I0_n14_0_0 = '0 -14px 0 0'
  static readonly I0_n20 = '0 -20px'
  static readonly I12_0 = '12px 0'
  static readonly I12_20 = '12px 20px'
  static readonly I12_20_16 = '12px 20px 16px'
  static readonly I12_20_20 = '12px 20px 20px'
  static readonly I14_0 = '14px 0'
  static readonly I16_20 = '16px 20px'
  static readonly I16_20_20 = '16px 20px 20px'
  static readonly I16_20_24 = '16px 20px 24px'
  static readonly I20_20_0 = '20px 20px 0'
  static readonly I22_20 = '22px 20px'
  static readonly I32_16 = '32px 16px'
  static readonly I3_7 = '3px 7px'
  static readonly I4_0 = '4px 0'
  static readonly I4_10 = '4px 10px'
  static readonly I4_16 = '4px 16px'
  static readonly I4_8 = '4px 8px'
  static readonly I56_0 = '56px 0'
  static readonly I64_20 = '64px 20px'
  static readonly I6_8 = '6px 8px'
  static readonly I8_0 = '8px 0'
  static readonly I8_12_0 = '8px 12px 0'
  static readonly I8_20_12 = '8px 20px 12px'
  static readonly I8_20_14 = '8px 20px 14px'
  static readonly I8_20_20 = '8px 20px 20px'
  static readonly I8_20_24 = '8px 20px 24px'
  static readonly In12_0 = '-12px 0'
  static readonly In14_0 = '-14px 0'
  static readonly In3_n6_0_0 = '-3px -6px 0 0'
  static readonly In5_0 = '-5px 0'
  static readonly In8_0 = '-8px 0'
  static readonly In9_n12_n9_0 = '-9px -12px -9px 0'
}
