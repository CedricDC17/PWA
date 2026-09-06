// src/hooks/useLongPress.js
import { useCallback, useRef } from 'react'

const DELAY = 450
const MOVE_TOLERANCE = 10 // px : au-delà, c'est un scroll, pas un appui long

/**
 * Gère "tap court" vs "appui long" avec les pointer events
 * (couvre souris et tactile sans double déclenchement).
 */
export default function useLongPress(onLongPress, onClick) {
  const timer = useRef(null)
  const startPos = useRef({ x: 0, y: 0 })
  const longPressed = useRef(false)

  const cancel = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
  }, [])

  const onPointerDown = useCallback(e => {
    longPressed.current = false
    startPos.current = { x: e.clientX, y: e.clientY }
    cancel()
    timer.current = setTimeout(() => {
      longPressed.current = true
      timer.current = null
      onLongPress?.()
    }, DELAY)
  }, [cancel, onLongPress])

  const onPointerMove = useCallback(e => {
    if (!timer.current) return
    const dx = Math.abs(e.clientX - startPos.current.x)
    const dy = Math.abs(e.clientY - startPos.current.y)
    if (dx > MOVE_TOLERANCE || dy > MOVE_TOLERANCE) cancel()
  }, [cancel])

  const onClickHandler = useCallback(e => {
    if (longPressed.current) {
      // l'appui long a déjà agi : on neutralise le clic qui suit
      e.preventDefault()
      e.stopPropagation()
      longPressed.current = false
      return
    }
    onClick?.(e)
  }, [onClick])

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: cancel,
    onPointerLeave: cancel,
    onPointerCancel: cancel,
    onClick: onClickHandler,
    onContextMenu: e => e.preventDefault(),
  }
}
