import { Text as RNText, TextProps, StyleSheet } from 'react-native';
import { colors, typography } from '../theme';

interface Props extends TextProps {
  strong?: boolean;
  muted?: boolean;
  as?: any;
}

export function Text({ strong, muted, style, children, ...props }: Props) {
  return (
    <RNText
      style={[
        styles.base,
        strong && styles.strong,
        muted && styles.muted,
        style,
      ]}
      {...props}
    >
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
