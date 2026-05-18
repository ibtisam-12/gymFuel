import React from 'react';
import { Text as RNText, TextProps as RNTextProps } from 'react-native';
import resourceKeys from '../resource_keys.json';

export type LocalizedKey = keyof typeof resourceKeys;

/**
 * Static translation dictionary helper.
 * Resolves keys dynamically while ensuring fallbacks exist.
 */
export const getString = (key: string): string => {
  const dict = resourceKeys as Record<string, string>;
  return dict[key] || key;
};

export interface TextProps extends RNTextProps {
  children?: React.ReactNode;
}

/**
 * Gorgeous Typography element for GymFuel AI.
 * Automatically intercepts translation IDs (e.g. "B_WELCOME_BACK") and maps them
 * to the localized string value, while maintaining custom formatting styles.
 */
export const Text: React.FC<TextProps> = ({ children, style, ...props }) => {
  let displayContent = children;

  if (typeof children === 'string' && children.startsWith('B_')) {
    displayContent = getString(children);
  }

  return (
    <RNText style={[{ fontFamily: 'System' }, style]} {...props}>
      {displayContent}
    </RNText>
  );
};
