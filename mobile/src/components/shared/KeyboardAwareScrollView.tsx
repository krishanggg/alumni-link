import {
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useRef,
  useState,
  type ForwardedRef,
} from 'react';
import {
  Keyboard,
  Platform,
  ScrollView,
  StatusBar,
  TextInput,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewProps,
  type TextInputProps,
} from 'react-native';

import { spacing } from '../../theme';

type Props = ScrollViewProps & {
  focusedFieldGap?: number;
};

const KeyboardAwareFocusContext = createContext<((input: TextInput) => void) | null>(null);
const KEYBOARD_LAYOUT_SETTLE_DELAY_MS = 50;
const KEYBOARD_SCROLL_RECHECK_DELAY_MS = 250;
const MAX_KEYBOARD_SCROLL_ATTEMPTS = 3;

/**
 * `scrollTo` takes a content offset while the field is only measurable on screen,
 * so the overlap is applied as a delta on top of the live scroll position rather
 * than re-derived from `measureLayout` (whose content coordinates the platform
 * invalidates while the keyboard resizes the window). Both `fieldBottom` and
 * `visibleBottom` must come from the same measurement space — see
 * `getVisibleBottom`.
 */
export function getKeyboardScrollTarget(
  currentScrollY: number,
  fieldBottom: number,
  visibleBottom: number,
  focusedFieldGap: number,
): number {
  return Math.max(0, currentScrollY + fieldBottom + focusedFieldGap - visibleBottom);
}

/**
 * The vertical distance between the screen origin and the window origin that
 * `measureInWindow` reports against.
 *
 * On Android the window excludes the status bar, so the two spaces differ by
 * exactly its height; on iOS `measureInWindow` and the keyboard's `screenY`
 * already share one space.
 */
export function getWindowScreenOffset(): number {
  if (Platform.OS !== 'android') {
    return 0;
  }
  return StatusBar.currentHeight ?? 0;
}

/**
 * The lowest point a focused field may occupy while staying clear of the keyboard.
 *
 * `measureInWindow` reports window coordinates whereas `keyboardDidShow` reports
 * `screenY` in screen coordinates, so the keyboard is converted into the measured
 * field's own space before the two are compared — mixing the two coordinate
 * spaces under-scrolls by exactly `windowScreenOffset`.
 *
 * The scroll view's own bottom is still taken when it is lower: where the window
 * *is* resized for the keyboard, that bottom is the real limit. Under Android's
 * edge-to-edge windows it is not resized, the keyboard simply overlays it, and
 * the converted keyboard top is what wins.
 */
export function getVisibleBottom(
  scrollViewWindowTop: number,
  scrollViewHeight: number,
  keyboardScreenTop: number,
  windowScreenOffset: number,
): number {
  return Math.min(
    scrollViewWindowTop + scrollViewHeight,
    keyboardScreenTop - windowScreenOffset,
  );
}

export function KeyboardAwareScrollView({
  children,
  focusedFieldGap = spacing.xl,
  onContentSizeChange,
  onLayout,
  onScroll,
  ...scrollViewProps
}: Props) {
  const scrollViewRef = useRef<ScrollView>(null);
  const focusedInputRef = useRef<TextInput | null>(null);
  const keyboardTopRef = useRef<number | null>(null);
  const scrollYRef = useRef(0);
  const needsKeyboardAdjustmentRef = useRef(false);
  const keyboardScrollAttemptsRef = useRef(0);
  const keyboardScrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  function cancelPendingKeyboardScroll() {
    if (keyboardScrollTimeoutRef.current) {
      clearTimeout(keyboardScrollTimeoutRef.current);
      keyboardScrollTimeoutRef.current = null;
    }
  }

  function scheduleKeyboardScrollRecheck(delay: number) {
    cancelPendingKeyboardScroll();
    keyboardScrollTimeoutRef.current = setTimeout(() => {
      keyboardScrollTimeoutRef.current = null;
      ensureFocusedFieldIsVisible();
    }, delay);
  }

  function ensureFocusedFieldIsVisible() {
    const scrollView = scrollViewRef.current;
    const focusedInput = focusedInputRef.current;
    const keyboardTop = keyboardTopRef.current;
    if (
      !scrollView ||
      !focusedInput ||
      keyboardTop === null ||
      !needsKeyboardAdjustmentRef.current
    ) {
      return;
    }

    const nativeScrollView = scrollView.getNativeScrollRef();
    if (!nativeScrollView) {
      return;
    }

    nativeScrollView.measureInWindow((_scrollLeft, scrollTop, _scrollWidth, scrollHeight) => {
      focusedInput.measureInWindow((_left, top, _width, height) => {
        const fieldBottom = top + height;
        const visibleBottom = getVisibleBottom(
          scrollTop,
          scrollHeight,
          keyboardTop,
          getWindowScreenOffset(),
        );
        if (fieldBottom + focusedFieldGap <= visibleBottom) {
          needsKeyboardAdjustmentRef.current = false;
          keyboardScrollAttemptsRef.current = 0;
          cancelPendingKeyboardScroll();
          return;
        }

        if (keyboardScrollAttemptsRef.current >= MAX_KEYBOARD_SCROLL_ATTEMPTS) {
          needsKeyboardAdjustmentRef.current = false;
          return;
        }

        keyboardScrollAttemptsRef.current += 1;
        scrollView.scrollTo({
          y: getKeyboardScrollTarget(
            scrollYRef.current,
            fieldBottom,
            visibleBottom,
            focusedFieldGap,
          ),
          animated: false,
        });
        scheduleKeyboardScrollRecheck(KEYBOARD_SCROLL_RECHECK_DELAY_MS);
      });
    });
  }

  function handleInputFocus(input: TextInput) {
    focusedInputRef.current = input;
    needsKeyboardAdjustmentRef.current = true;
    keyboardScrollAttemptsRef.current = 0;
    ensureFocusedFieldIsVisible();
  }

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', (event) => {
      keyboardTopRef.current = event.endCoordinates.screenY;
      needsKeyboardAdjustmentRef.current = true;
      keyboardScrollAttemptsRef.current = 0;
      setKeyboardHeight(event.endCoordinates.height);
      scheduleKeyboardScrollRecheck(KEYBOARD_LAYOUT_SETTLE_DELAY_MS);
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      keyboardTopRef.current = null;
      needsKeyboardAdjustmentRef.current = false;
      keyboardScrollAttemptsRef.current = 0;
      cancelPendingKeyboardScroll();
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
      cancelPendingKeyboardScroll();
    };
  }, []);

  return (
    <KeyboardAwareFocusContext.Provider value={handleInputFocus}>
      <ScrollView
        {...scrollViewProps}
        ref={scrollViewRef}
        scrollEventThrottle={16}
        onScroll={(event: NativeSyntheticEvent<NativeScrollEvent>) => {
          scrollYRef.current = event.nativeEvent.contentOffset.y;
          onScroll?.(event);
        }}
        onContentSizeChange={(width, height) => {
          onContentSizeChange?.(width, height);
          ensureFocusedFieldIsVisible();
        }}
        onLayout={(event) => {
          onLayout?.(event);
          ensureFocusedFieldIsVisible();
        }}
      >
        {children}
        <View
          style={{ height: keyboardHeight > 0 ? keyboardHeight + focusedFieldGap : 0 }}
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      </ScrollView>
    </KeyboardAwareFocusContext.Provider>
  );
}

export const KeyboardAwareTextInput = forwardRef<TextInput, TextInputProps>(
  function KeyboardAwareTextInput({ onFocus, ...textInputProps }, ref) {
    const handleKeyboardAwareFocus = useContext(KeyboardAwareFocusContext);
    const textInputRef = useRef<TextInput | null>(null);

    function setTextInputRef(input: TextInput | null, forwardedRef: ForwardedRef<TextInput>) {
      textInputRef.current = input;

      if (typeof forwardedRef === 'function') {
        forwardedRef(input);
      } else if (forwardedRef) {
        forwardedRef.current = input;
      }
    }

    return (
      <TextInput
        {...textInputProps}
        ref={(input) => setTextInputRef(input, ref)}
        onFocus={(event) => {
          if (textInputRef.current) {
            handleKeyboardAwareFocus?.(textInputRef.current);
          }
          onFocus?.(event);
        }}
      />
    );
  },
);
