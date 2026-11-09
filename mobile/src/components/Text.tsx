import { Text as RNText, TextProps, StyleSheet, StyleProp, TextStyle } from 'react-native';
import { colors, typography } from '../theme';
import { useFontScale } from '../store/fontScale';

interface Props extends TextProps {
  strong?: boolean;
  muted?: boolean;
  as?: any;
}

function scaleTextStyle(style: StyleProp<TextStyle>, m: number): StyleProp<TextStyle> {
  if (m === 1 || !style) return style;
  const flat = StyleSheet.flatten(style);
  if (!flat) return style;
  const out: any = { ...flat };
  if (typeof out.fontSize === 'number') out.fontSize = Math.round(out.fontSize * m);
  if (typeof out.lineHeight === 'number') out.lineHeight = Math.round(out.lineHeight * m);
  return out as TextStyle;
}

export function Text({ strong, muted, style, children, ...props }: Props) {
  const { multiplier } = useFontScale();
  const combined = [styles.base, strong && styles.strong, muted && styles.muted, style];
  return (
    <RNText style={scaleTextStyle(combined as any, multiplier)} {...props}>
      {children}
    </RNText>
  );
}

const styles = StyleSheet.create({
  base: {
    ...typography.body,
    color: colors.text,
  },
  strong: {
    fontWeight: '700',
  },
  muted: {
    color: colors.muted,
  },
});

