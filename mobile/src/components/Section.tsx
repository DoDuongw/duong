import { View, StyleSheet } from 'react-native';
import { Card } from './Card';
import { Text } from './Text';
import { colors, spacing, typography } from '../theme';

interface SectionProps {
  title: string;
  icon?: string;
  description?: string;
  children: React.ReactNode;
}

export function Section({ title, icon, description, children }: SectionProps) {
  return (
    <Card>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          {icon ? <Text style={styles.icon}>{icon}</Text> : null}
          <Text style={styles.title}>{title}</Text>
        </View>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
      {children}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  icon: {
    fontSize: 21,
  },
  title: {
    ...typography.h2,
    color: colors.text,
  },
  description: {
    ...typography.bodySm,
    color: colors.muted,
    marginTop: 4,
  },
});
