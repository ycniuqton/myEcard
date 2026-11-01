/** Named CSS style values (motion, borders, grids, shadows, icon sizes) shared by the UI. */

/** CSS animation and transition shorthands. */
export class Motion {
  static readonly A_wmIn_200ms_ease_out = 'wmIn 200ms ease-out'
  static readonly A_wmIn_220ms_ease_out = 'wmIn 220ms ease-out'
  static readonly A_wmIn_250ms_ease_out = 'wmIn 250ms ease-out'
  static readonly A_wmIn_300ms_ease_out = 'wmIn 300ms ease-out'
  static readonly A_wmUp_260ms_ease_out = 'wmUp 260ms ease-out'
  static readonly T_all_150ms_ease_out = 'all 150ms ease-out'
  static readonly T_all_200ms_ease_out = 'all 200ms ease-out'
  static readonly T_background_200ms_ease_out = 'background 200ms ease-out'
  static readonly T_color_200ms = 'color 200ms'
  static readonly T_left_200ms_ease_out = 'left 200ms ease-out'
  static readonly T_transform_100ms_ease_out = 'transform 100ms ease-out'
  static readonly T_width_300ms_ease_out = 'width 300ms ease-out'
}

/** Border shorthands. */
export class Border {
  static readonly B_1_5px_solid_muted = '1.5px solid var(--muted)'
  static readonly B_1px_solid_border = '1px solid var(--border)'
  static readonly B_1px_solid_line = '1px solid var(--line)'
  static readonly B_2_5px_solid_brand = '2.5px solid var(--brand)'
}

/** Grid column templates. */
export class Grid {
  static readonly C_48px_1fr_auto = '48px 1fr auto'
  static readonly C_52px_1fr_auto = '52px 1fr auto'
  static readonly C_repeat_2_minmax_0_1fr = 'repeat(2,minmax(0,1fr))'
  static readonly C_repeat_4_minmax_0_1fr = 'repeat(4,minmax(0,1fr))'
  static readonly C_repeat_5_59px = 'repeat(5,59px)'
}

/** Box shadow values. */
export class Shadow {
  static readonly S_0_0_0_10px_frame_0_24px_60px_rgba_0_0_0_22 = '0 0 0 10px var(--frame),0 24px 60px rgba(0,0,0,.22)'
  static readonly S_shadow = 'var(--shadow)'
}

export enum IconSize {
  S16 = 16,
  S18 = 18,
  S20 = 20,
  S22 = 22,
  S24 = 24,
  S28 = 28,
}
