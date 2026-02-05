import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';

describe('useKeyboardShortcuts', () => {
  let addEventListenerSpy: jest.SpyInstance;
  let removeEventListenerSpy: jest.SpyInstance;

  beforeEach(() => {
    addEventListenerSpy = jest.spyOn(window, 'addEventListener');
    removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
  });

  afterEach(() => {
    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });

  const fireKeyDown = (key: string, options: Partial<KeyboardEvent> = {}) => {
    const event = new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true,
      ...options,
    });
    jest.spyOn(event, 'preventDefault');
    jest.spyOn(event, 'stopPropagation');
    window.dispatchEvent(event);
    return event;
  };

  it('should add event listener on mount', () => {
    const action = jest.fn();
    renderHook(() => useKeyboardShortcuts([{ key: 'a', action }]));

    expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function), true);
  });

  it('should remove event listener on unmount', () => {
    const action = jest.fn();
    const { unmount } = renderHook(() => useKeyboardShortcuts([{ key: 'a', action }]));

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function), true);
  });

  it('should call action when matching key is pressed', () => {
    const action = jest.fn();
    renderHook(() => useKeyboardShortcuts([{ key: 'a', action }]));

    fireKeyDown('a');

    expect(action).toHaveBeenCalledTimes(1);
  });

  it('should be case-insensitive for key matching', () => {
    const action = jest.fn();
    renderHook(() => useKeyboardShortcuts([{ key: 'A', action }]));

    fireKeyDown('a');

    expect(action).toHaveBeenCalledTimes(1);
  });

  it('should not call action when non-matching key is pressed', () => {
    const action = jest.fn();
    renderHook(() => useKeyboardShortcuts([{ key: 'a', action }]));

    fireKeyDown('b');

    expect(action).not.toHaveBeenCalled();
  });

  it('should match Ctrl modifier', () => {
    const action = jest.fn();
    renderHook(() => useKeyboardShortcuts([{ key: 's', ctrl: true, action }]));

    // Without Ctrl - should not match
    fireKeyDown('s');
    expect(action).not.toHaveBeenCalled();

    // With Ctrl - should match
    fireKeyDown('s', { ctrlKey: true });
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('should match Shift modifier', () => {
    const action = jest.fn();
    renderHook(() => useKeyboardShortcuts([{ key: 'Tab', shift: true, action }]));

    fireKeyDown('Tab');
    expect(action).not.toHaveBeenCalled();

    fireKeyDown('Tab', { shiftKey: true });
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('should match Alt modifier', () => {
    const action = jest.fn();
    renderHook(() => useKeyboardShortcuts([{ key: '\\', alt: true, action }]));

    fireKeyDown('\\');
    expect(action).not.toHaveBeenCalled();

    fireKeyDown('\\', { altKey: true });
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('should match combined modifiers', () => {
    const action = jest.fn();
    renderHook(() => useKeyboardShortcuts([{ key: 'Tab', ctrl: true, shift: true, action }]));

    // Only Ctrl
    fireKeyDown('Tab', { ctrlKey: true });
    expect(action).not.toHaveBeenCalled();

    // Only Shift
    fireKeyDown('Tab', { shiftKey: true });
    expect(action).not.toHaveBeenCalled();

    // Both Ctrl+Shift
    fireKeyDown('Tab', { ctrlKey: true, shiftKey: true });
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('should match metaKey as Ctrl alternative', () => {
    const action = jest.fn();
    renderHook(() => useKeyboardShortcuts([{ key: 's', ctrl: true, action }]));

    fireKeyDown('s', { metaKey: true });
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('should call preventDefault and stopPropagation on match', () => {
    const action = jest.fn();
    renderHook(() => useKeyboardShortcuts([{ key: 'a', action }]));

    const event = fireKeyDown('a');

    expect(event.preventDefault).toHaveBeenCalled();
    expect(event.stopPropagation).toHaveBeenCalled();
  });

  it('should handle multiple shortcuts', () => {
    const action1 = jest.fn();
    const action2 = jest.fn();
    renderHook(() => useKeyboardShortcuts([
      { key: 'a', action: action1 },
      { key: 'b', action: action2 },
    ]));

    fireKeyDown('a');
    expect(action1).toHaveBeenCalledTimes(1);
    expect(action2).not.toHaveBeenCalled();

    fireKeyDown('b');
    expect(action1).toHaveBeenCalledTimes(1);
    expect(action2).toHaveBeenCalledTimes(1);
  });

  it('should only call first matching shortcut', () => {
    const action1 = jest.fn();
    const action2 = jest.fn();
    renderHook(() => useKeyboardShortcuts([
      { key: 'a', action: action1 },
      { key: 'a', action: action2 },
    ]));

    fireKeyDown('a');

    expect(action1).toHaveBeenCalledTimes(1);
    expect(action2).not.toHaveBeenCalled();
  });
});
