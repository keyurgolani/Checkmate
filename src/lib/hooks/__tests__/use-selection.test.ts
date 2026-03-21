// @vitest-environment jsdom

import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSelection } from "../use-selection";

describe("useSelection", () => {
  const items = ["id-1", "id-2", "id-3", "id-4", "id-5"];

  it("starts in non-selection mode with nothing selected", () => {
    const { result } = renderHook(() => useSelection(items));
    expect(result.current.isSelectionMode).toBe(false);
    expect(result.current.selectedIds.size).toBe(0);
  });

  it("enters selection mode", () => {
    const { result } = renderHook(() => useSelection(items));
    act(() => result.current.enterSelectionMode());
    expect(result.current.isSelectionMode).toBe(true);
  });

  it("enters selection mode with initial item selected", () => {
    const { result } = renderHook(() => useSelection(items));
    act(() => result.current.enterSelectionMode("id-2"));
    expect(result.current.isSelectionMode).toBe(true);
    expect(result.current.isSelected("id-2")).toBe(true);
    expect(result.current.selectedIds.size).toBe(1);
  });

  it("exits selection mode and clears selection", () => {
    const { result } = renderHook(() => useSelection(items));
    act(() => result.current.enterSelectionMode("id-1"));
    act(() => result.current.exitSelectionMode());
    expect(result.current.isSelectionMode).toBe(false);
    expect(result.current.selectedIds.size).toBe(0);
  });

  it("toggles item selection", () => {
    const { result } = renderHook(() => useSelection(items));
    act(() => result.current.enterSelectionMode());
    act(() => result.current.toggleItem("id-1"));
    expect(result.current.isSelected("id-1")).toBe(true);
    act(() => result.current.toggleItem("id-1"));
    expect(result.current.isSelected("id-1")).toBe(false);
  });

  it("selects all items", () => {
    const { result } = renderHook(() => useSelection(items));
    act(() => result.current.enterSelectionMode());
    act(() => result.current.selectAll());
    expect(result.current.selectedIds.size).toBe(5);
  });

  it("deselects all items and exits selection mode", () => {
    const { result } = renderHook(() => useSelection(items));
    act(() => result.current.enterSelectionMode());
    act(() => result.current.selectAll());
    act(() => result.current.deselectAll());
    expect(result.current.selectedIds.size).toBe(0);
    expect(result.current.isSelectionMode).toBe(false);
  });

  it("handles range select with shift", () => {
    const { result } = renderHook(() => useSelection(items));
    act(() => result.current.enterSelectionMode());
    act(() => result.current.handleClick("id-1", { metaKey: false, ctrlKey: false, shiftKey: false, preventDefault: () => {} } as unknown as React.MouseEvent));
    act(() => result.current.handleClick("id-4", { metaKey: false, ctrlKey: false, shiftKey: true, preventDefault: () => {} } as unknown as React.MouseEvent));
    expect(result.current.isSelected("id-1")).toBe(true);
    expect(result.current.isSelected("id-2")).toBe(true);
    expect(result.current.isSelected("id-3")).toBe(true);
    expect(result.current.isSelected("id-4")).toBe(true);
    expect(result.current.isSelected("id-5")).toBe(false);
  });

  it("handles ctrl/cmd click to toggle without affecting others", () => {
    const { result } = renderHook(() => useSelection(items));
    act(() => result.current.enterSelectionMode());
    act(() => result.current.handleClick("id-1", { metaKey: false, ctrlKey: false, shiftKey: false, preventDefault: () => {} } as unknown as React.MouseEvent));
    act(() => result.current.handleClick("id-3", { metaKey: false, ctrlKey: true, shiftKey: false, preventDefault: () => {} } as unknown as React.MouseEvent));
    expect(result.current.isSelected("id-1")).toBe(true);
    expect(result.current.isSelected("id-3")).toBe(true);
    expect(result.current.isSelected("id-2")).toBe(false);
  });

  it("plain click replaces selection with single item", () => {
    const { result } = renderHook(() => useSelection(items));
    act(() => result.current.enterSelectionMode());
    act(() => result.current.handleClick("id-1", { metaKey: false, ctrlKey: false, shiftKey: false, preventDefault: () => {} } as unknown as React.MouseEvent));
    act(() => result.current.handleClick("id-3", { metaKey: false, ctrlKey: false, shiftKey: false, preventDefault: () => {} } as unknown as React.MouseEvent));
    expect(result.current.isSelected("id-1")).toBe(false);
    expect(result.current.isSelected("id-3")).toBe(true);
    expect(result.current.selectedIds.size).toBe(1);
  });

  it("does nothing when handleClick called outside selection mode", () => {
    const { result } = renderHook(() => useSelection(items));
    act(() => result.current.handleClick("id-1", { metaKey: false, ctrlKey: false, shiftKey: false, preventDefault: () => {} } as unknown as React.MouseEvent));
    expect(result.current.isSelectionMode).toBe(false);
    expect(result.current.selectedIds.size).toBe(0);
  });
});
