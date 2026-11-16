import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

import { encodeCode128 } from '../domain/code128';
import { colors, spacing } from './theme';

/** Aperçu à l'écran d'un code-barres Code 128, scannable tel quel. */
export function Barcode({ code, height = 90 }: { code: string; height?: number }) {
  const geometry = useMemo(() => encodeCode128(code), [code]);
  return (
    <View style={styles.container} accessibilityLabel={`Code-barres ${code}`}>
      <Svg
        width="100%"
        height={height}
        viewBox={`0 0 ${geometry.totalModules} 1`}
        preserveAspectRatio="none"
      >
        {geometry.bars.map((bar) => (
          <Rect key={bar.x} x={bar.x} y={0} width={bar.width} height={1} fill="#000" />
        ))}
      </Svg>
      <Text style={styles.code}>{code}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  code: {
    marginTop: spacing.sm,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
    color: '#000',
  },
});
