"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { GripVertical } from "lucide-react";
import type { PayableDragPayload } from "@/lib/payables-drag";

export const PAYABLE_DROP_DAY_ATTR = "data-payable-drop-day";

const DRAG_THRESHOLD_PX = 10;

type ActivePointerDrag = PayableDragPayload & {
  label: string;
  pointerId: number;
};

type PayablesDragContextValue = {
  draggingPayableId: string | null;
  dropTargetDateKey: string | null;
  isRescheduling: boolean;
  isPointerDragging: boolean;
  beginPointerDrag: (
    payload: PayableDragPayload,
    label: string,
    e: React.PointerEvent<HTMLElement>
  ) => void;
  beginHtmlDrag: (payableId: string) => void;
  endHtmlDrag: () => void;
  setHtmlDropTarget: (dateKey: string | null) => void;
};

const PayablesDragContext = React.createContext<PayablesDragContextValue | null>(
  null
);

export function usePayablesDrag() {
  const ctx = React.useContext(PayablesDragContext);
  if (!ctx) {
    throw new Error("usePayablesDrag debe usarse dentro de PayablesDragProvider");
  }
  return ctx;
}

function findDropDateKey(clientX: number, clientY: number): string | null {
  const el = document.elementFromPoint(clientX, clientY);
  const drop = el?.closest(`[${PAYABLE_DROP_DAY_ATTR}]`);
  return drop?.getAttribute(PAYABLE_DROP_DAY_ATTR) ?? null;
}

export function PayablesDragProvider({
  children,
  onDueDateChange,
  disabled = false,
}: {
  children: React.ReactNode;
  onDueDateChange: (
    payableId: string,
    fromDateKey: string,
    toDateKey: string
  ) => Promise<void>;
  disabled?: boolean;
}) {
  const [draggingPayableId, setDraggingPayableId] = React.useState<string | null>(
    null
  );
  const [dropTargetDateKey, setDropTargetDateKey] = React.useState<string | null>(
    null
  );
  const [isRescheduling, setIsRescheduling] = React.useState(false);
  const [ghost, setGhost] = React.useState<{
    label: string;
    x: number;
    y: number;
  } | null>(null);
  const [isPointerDragging, setIsPointerDragging] = React.useState(false);

  const dropTargetRef = React.useRef<string | null>(null);
  const pendingRef = React.useRef<{
    payload: PayableDragPayload;
    label: string;
    startX: number;
    startY: number;
    pointerId: number;
  } | null>(null);
  const activeRef = React.useRef<ActivePointerDrag | null>(null);

  const clearDrag = React.useCallback(() => {
    pendingRef.current = null;
    activeRef.current = null;
    dropTargetRef.current = null;
    setDraggingPayableId(null);
    setDropTargetDateKey(null);
    setGhost(null);
    setIsPointerDragging(false);
    document.body.style.overflow = "";
    document.body.style.touchAction = "";
  }, []);

  React.useEffect(() => () => clearDrag(), [clearDrag]);

  const commitDrop = React.useCallback(
    async (payload: PayableDragPayload, targetDateKey: string | null) => {
      if (!targetDateKey || targetDateKey === payload.sourceDateKey) return;
      setIsRescheduling(true);
      try {
        await onDueDateChange(payload.id, payload.sourceDateKey, targetDateKey);
      } finally {
        setIsRescheduling(false);
      }
    },
    [onDueDateChange]
  );

  React.useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const pending = pendingRef.current;

      if (pending && pending.pointerId === e.pointerId) {
        const dist = Math.hypot(e.clientX - pending.startX, e.clientY - pending.startY);
        if (dist < DRAG_THRESHOLD_PX) return;

        activeRef.current = {
          id: pending.payload.id,
          sourceDateKey: pending.payload.sourceDateKey,
          label: pending.label,
          pointerId: pending.pointerId,
        };
        pendingRef.current = null;
        setDraggingPayableId(activeRef.current.id);
        setIsPointerDragging(true);
        document.body.style.overflow = "hidden";
        document.body.style.touchAction = "none";
      }

      if (!activeRef.current || activeRef.current.pointerId !== e.pointerId) return;

      e.preventDefault();
      setGhost({ label: activeRef.current.label, x: e.clientX, y: e.clientY });
      const key = findDropDateKey(e.clientX, e.clientY);
      dropTargetRef.current = key;
      setDropTargetDateKey(key);
    };

    const onEnd = (e: PointerEvent) => {
      const pending = pendingRef.current;
      if (pending?.pointerId === e.pointerId) {
        pendingRef.current = null;
        return;
      }

      const active = activeRef.current;
      if (!active || active.pointerId !== e.pointerId) return;

      e.preventDefault();
      const target = dropTargetRef.current;
      void commitDrop(
        { id: active.id, sourceDateKey: active.sourceDateKey },
        target
      );
      clearDrag();
    };

    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onEnd);
    window.addEventListener("pointercancel", onEnd);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onEnd);
      window.removeEventListener("pointercancel", onEnd);
    };
  }, [clearDrag, commitDrop]);

  const beginPointerDrag = React.useCallback(
    (payload: PayableDragPayload, label: string, e: React.PointerEvent<HTMLElement>) => {
      if (disabled || isRescheduling) return;
      if (e.button !== 0) return;

      e.preventDefault();
      e.stopPropagation();

      pendingRef.current = {
        payload,
        label,
        startX: e.clientX,
        startY: e.clientY,
        pointerId: e.pointerId,
      };
    },
    [disabled, isRescheduling]
  );

  const beginHtmlDrag = React.useCallback(
    (payableId: string) => {
      if (disabled || isRescheduling) return;
      setDraggingPayableId(payableId);
    },
    [disabled, isRescheduling]
  );

  const endHtmlDrag = clearDrag;

  const setHtmlDropTarget = React.useCallback((dateKey: string | null) => {
    dropTargetRef.current = dateKey;
    setDropTargetDateKey(dateKey);
  }, []);

  const value = React.useMemo(
    () => ({
      draggingPayableId,
      dropTargetDateKey,
      isRescheduling,
      isPointerDragging,
      beginPointerDrag,
      beginHtmlDrag,
      endHtmlDrag,
      setHtmlDropTarget,
    }),
    [
      draggingPayableId,
      dropTargetDateKey,
      isRescheduling,
      isPointerDragging,
      beginPointerDrag,
      beginHtmlDrag,
      endHtmlDrag,
      setHtmlDropTarget,
    ]
  );

  return (
    <PayablesDragContext.Provider value={value}>
      {children}
      {typeof document !== "undefined" &&
        ghost &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[200] flex max-w-[220px] items-center gap-2 rounded-xl border-2 border-primary bg-card px-3 py-2 shadow-2xl shadow-primary/25"
            style={{
              left: ghost.x,
              top: ghost.y,
              transform: "translate(-50%, -120%)",
            }}
            aria-hidden
          >
            <GripVertical className="size-4 shrink-0 text-primary" />
            <span className="truncate text-sm font-bold text-foreground">
              {ghost.label}
            </span>
          </div>,
          document.body
        )}
    </PayablesDragContext.Provider>
  );
}

/** Atributo para zonas donde se puede soltar una factura. */
export function payableDropDayProps(dateKey: string) {
  return { [PAYABLE_DROP_DAY_ATTR]: dateKey };
}

export function usePayablesDropDayState(dateKey: string) {
  const { dropTargetDateKey, draggingPayableId, isRescheduling } = usePayablesDrag();
  const isDropTarget = dropTargetDateKey === dateKey;
  const canDrop = draggingPayableId !== null && !isRescheduling;
  return { isDropTarget, canDrop };
}
