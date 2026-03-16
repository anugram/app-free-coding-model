/**
 * AegisNote - useAccessibility Hook
 *
 * Custom hook to access accessibility features in components.
 */

import {useState, useEffect, useCallback} from 'react';
import {accessibilityManager} from './AccessibilityManager';

/**
 * Accessibility state
 */
export interface AccessibilityState {
  isScreenReaderEnabled: boolean;
  announceForAccessibility: (message: string) => void;
}

/**
 * useAccessibility - Hook to access accessibility features
 *
 * Returns the current screen reader status and utilities for
 * announcing messages to VoiceOver (iOS) and TalkBack (Android).
 */
export function useAccessibility(): AccessibilityState {
  const [isScreenReaderEnabled, setIsScreenReaderEnabled] = useState(false);

  useEffect(() => {
    let isSubscribed = true;

    // Check initial state
    accessibilityManager.isScreenReaderEnabled().then((enabled) => {
      if (isSubscribed) {
        setIsScreenReaderEnabled(enabled);
      }
    });

    // Listen for changes
    const subscription = accessibilityManager
      .getConfig()
      .isScreenReaderEnabled()
      .then((enabled) => {
        if (isSubscribed) {
          setIsScreenReaderEnabled(enabled);
        }
      });

    return () => {
      isSubscribed = false;
    };
  }, []);

  const announceForAccessibility = useCallback(
    (message: string) => {
      accessibilityManager.announceForAccessibility(message);
    },
    [],
  );

  return {
    isScreenReaderEnabled,
    announceForAccessibility,
  };
}
