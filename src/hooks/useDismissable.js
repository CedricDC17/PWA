// src/hooks/useDismissable.js
import { useEffect, useRef } from 'react'

/**
 * Permet de fermer un écran superposé de trois façons : touche Échap, bouton
 * retour du téléphone, ou appel direct de onClose.
 *
 * Le bouton retour est géré en empilant une entrée d'historique à l'ouverture :
 * un retour arrière ferme la fiche au lieu de quitter l'application.
 *
 * onClose est gardé dans une référence : si l'effet se réabonnait à chaque
 * changement d'identité du callback, son nettoyage déclencherait un
 * history.back() parasite qui refermerait l'écran tout seul.
 */
export default function useDismissable(active, onClose) {
  const handler = useRef(onClose)

  useEffect(() => {
    handler.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!active) return

    let closedByBack = false

    const onKeyDown = e => {
      if (e.key === 'Escape') handler.current?.()
    }
    const onPopState = () => {
      closedByBack = true
      handler.current?.()
    }

    window.history.pushState({ overlay: true }, '')
    window.addEventListener('popstate', onPopState)
    document.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('popstate', onPopState)
      document.removeEventListener('keydown', onKeyDown)
      // Fermeture par l'interface : on retire l'entrée qu'on avait ajoutée
      // (inutile si c'est justement le retour arrière qui a fermé).
      if (!closedByBack && window.history.state?.overlay) {
        window.history.back()
      }
    }
  }, [active])
}
