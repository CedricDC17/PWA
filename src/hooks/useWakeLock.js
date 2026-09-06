// src/hooks/useWakeLock.js
import { useEffect } from 'react'

/**
 * Empêche l'écran de s'éteindre tant que le composant est monté (lecture d'une
 * recette en cuisinant). Sans effet si le navigateur ne gère pas l'API.
 */
export default function useWakeLock(active = true) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return

    let lock = null
    let cancelled = false

    const request = async () => {
      try {
        lock = await navigator.wakeLock.request('screen')
      } catch {
        // refus de l'utilisateur, batterie faible, onglet en arrière-plan : sans gravité
      }
    }

    // Le verrou saute quand l'onglet passe en arrière-plan : on le reprend au retour.
    const onVisibility = () => {
      if (!cancelled && document.visibilityState === 'visible') request()
    }

    request()
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibility)
      lock?.release?.().catch(() => {})
    }
  }, [active])
}
