export const palette = {
  background: '#F6F3EE',
  surface: '#EFE7DC',
  surfaceAlt: '#CAD2C5',
  text: '#2B2B2B',
  textMuted: '#6E6965',
  border: '#2B2B2B',
  coral: '#E76F51',
  mustard: '#E9C46A',
  teal: '#2A9D8F',
  sky: '#7FB3D5',
  lavender: '#B8A1D9',
  peach: '#F4A261',
  sage: '#84A98C',
  powder: '#CAD2C5',
  success: '#6A994E',
  warning: '#F2A65A',
  error: '#D64545',
  white: '#FFFFFF',
};

export const screenAccents = {
  auth: {
    primary: palette.coral,
    secondary: palette.mustard,
    tertiary: palette.surface,
  },
  dashboard: {
    primary: palette.mustard,
    secondary: palette.teal,
    tertiary: palette.powder,
  },
  tasks: {
    primary: palette.teal,
    secondary: palette.mustard,
    tertiary: palette.sky,
  },
  announcements: {
    primary: palette.coral,
    secondary: palette.peach,
    tertiary: palette.powder,
  },
  freedomWall: {
    primary: palette.lavender,
    secondary: palette.peach,
    tertiary: palette.mustard,
  },
  profile: {
    primary: palette.sky,
    secondary: palette.sage,
    tertiary: palette.surfaceAlt,
  },
};

export function brutalShadow(offsetX = 4, offsetY = 4, color = palette.border) {
  return {
    shadowColor: color,
    shadowOffset: { width: offsetX, height: offsetY },
    shadowOpacity: 0.22,
    shadowRadius: 0,
    elevation: 8,
  };
}

export function brutalCard(backgroundColor = palette.surface) {
  return {
    backgroundColor,
    borderWidth: 3,
    borderColor: palette.border,
    borderRadius: 24,
    ...brutalShadow(),
  };
}

export function brutalButton(backgroundColor = palette.teal) {
  return {
    backgroundColor,
    borderWidth: 3,
    borderColor: palette.border,
    borderRadius: 18,
    ...brutalShadow(),
  };
}

export function brutalInput(backgroundColor = palette.white) {
  return {
    backgroundColor,
    borderWidth: 3,
    borderColor: palette.border,
    borderRadius: 18,
  };
}

export const layout = {
  screenPadding: 20,
  sectionGap: 18,
  cardRadius: 24,
  buttonRadius: 18,
  inputRadius: 18,
};
