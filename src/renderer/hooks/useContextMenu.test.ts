import { renderHook, act } from '@testing-library/react';
import { useContextMenu } from './useContextMenu';

describe('useContextMenu', () => {
  it('should start with menu hidden', () => {
    const { result } = renderHook(() => useContextMenu<{ agentId: string }>());

    expect(result.current.contextMenu.visible).toBe(false);
    expect(result.current.contextMenu.x).toBe(0);
    expect(result.current.contextMenu.y).toBe(0);
    expect(result.current.contextMenu.target).toBeNull();
  });

  it('should open menu at mouse position with target', () => {
    const { result } = renderHook(() => useContextMenu<{ agentId: string }>());

    const mockEvent = {
      preventDefault: jest.fn(),
      clientX: 100,
      clientY: 200,
    } as unknown as React.MouseEvent;

    act(() => {
      result.current.openContextMenu(mockEvent, { agentId: 'agent-1' });
    });

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(result.current.contextMenu.visible).toBe(true);
    expect(result.current.contextMenu.x).toBe(100);
    expect(result.current.contextMenu.y).toBe(200);
    expect(result.current.contextMenu.target).toEqual({ agentId: 'agent-1' });
  });

  it('should close menu and clear target', () => {
    const { result } = renderHook(() => useContextMenu<{ id: string }>());

    const mockEvent = {
      preventDefault: jest.fn(),
      clientX: 50,
      clientY: 75,
    } as unknown as React.MouseEvent;

    act(() => {
      result.current.openContextMenu(mockEvent, { id: 'item-1' });
    });
    expect(result.current.contextMenu.visible).toBe(true);

    act(() => {
      result.current.closeContextMenu();
    });

    expect(result.current.contextMenu.visible).toBe(false);
    expect(result.current.contextMenu.target).toBeNull();
  });

  it('should replace target when opening on a different item', () => {
    const { result } = renderHook(() => useContextMenu<{ agentId: string }>());

    const event1 = { preventDefault: jest.fn(), clientX: 10, clientY: 20 } as unknown as React.MouseEvent;
    const event2 = { preventDefault: jest.fn(), clientX: 30, clientY: 40 } as unknown as React.MouseEvent;

    act(() => {
      result.current.openContextMenu(event1, { agentId: 'a' });
    });
    act(() => {
      result.current.openContextMenu(event2, { agentId: 'b' });
    });

    expect(result.current.contextMenu.visible).toBe(true);
    expect(result.current.contextMenu.x).toBe(30);
    expect(result.current.contextMenu.y).toBe(40);
    expect(result.current.contextMenu.target).toEqual({ agentId: 'b' });
  });

  it('should close on outside click when visible', () => {
    const { result } = renderHook(() => useContextMenu<{ id: string }>());

    const mockEvent = { preventDefault: jest.fn(), clientX: 10, clientY: 20 } as unknown as React.MouseEvent;

    act(() => {
      result.current.openContextMenu(mockEvent, { id: 'x' });
    });
    expect(result.current.contextMenu.visible).toBe(true);

    // Simulate outside click
    act(() => {
      window.dispatchEvent(new Event('click'));
    });

    expect(result.current.contextMenu.visible).toBe(false);
  });

  it('should not add click listener when menu is hidden', () => {
    const addSpy = jest.spyOn(window, 'addEventListener');
    const removeSpy = jest.spyOn(window, 'removeEventListener');

    renderHook(() => useContextMenu<{ id: string }>());

    // Should not have added a click listener for closing
    const clickCalls = addSpy.mock.calls.filter(([event]) => event === 'click');
    expect(clickCalls.length).toBe(0);

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it('should clean up click listener on unmount', () => {
    const removeSpy = jest.spyOn(window, 'removeEventListener');
    const { result, unmount } = renderHook(() => useContextMenu<{ id: string }>());

    const mockEvent = { preventDefault: jest.fn(), clientX: 10, clientY: 20 } as unknown as React.MouseEvent;

    act(() => {
      result.current.openContextMenu(mockEvent, { id: 'x' });
    });

    unmount();

    const clickCleanups = removeSpy.mock.calls.filter(([event]) => event === 'click');
    expect(clickCleanups.length).toBeGreaterThan(0);

    removeSpy.mockRestore();
  });
});
