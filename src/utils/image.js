// src/utils/image.js
//
// Les photos de recettes sont stockées dans Firestore, pas dans Firebase
// Storage (dont l'activation exige désormais un plan payant). Une photo est
// donc convertie en data URL et doit tenir dans un document Firestore, dont la
// taille maximale est de 1 Mio — d'où la compression et le plafond ci-dessous.

const MAX_BYTES = 700_000 // marge confortable sous la limite de 1 Mio

// Essais successifs, du plus beau au plus léger : le premier qui tient gagne.
const ESSAIS = [
  { taille: 1200, qualite: 0.82 },
  { taille: 1200, qualite: 0.7 },
  { taille: 1000, qualite: 0.7 },
  { taille: 800, qualite: 0.65 },
  { taille: 640, qualite: 0.6 },
]

const THUMB = { taille: 220, qualite: 0.7 }

/** Décode le fichier, en retombant sur <img> si createImageBitmap échoue (HEIC…). */
async function decode(file) {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file)
    } catch {
      // format non géré par cette voie : on tente la seconde
    }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    await new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = reject
      img.src = url
    })
    return img
  } finally {
    URL.revokeObjectURL(url)
  }
}

function versDataUrl(source, taille, qualite) {
  const ratio = Math.min(1, taille / Math.max(source.width, source.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(source.width * ratio))
  canvas.height = Math.max(1, Math.round(source.height * ratio))
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#fff' // évite un fond noir si l'image d'origine est transparente
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', qualite)
}

/**
 * Prépare une photo pour Firestore.
 * @returns {{ full: string, thumb: string, bytes: number }}
 *   full  : photo complète, affichée dans la fiche
 *   thumb : miniature, affichée sur les cartes de la liste
 * @throws si aucun réglage ne permet de tenir sous la limite
 */
export async function preparePhoto(file) {
  const source = await decode(file)
  try {
    let full = null
    for (const { taille, qualite } of ESSAIS) {
      const candidat = versDataUrl(source, taille, qualite)
      if (candidat.length <= MAX_BYTES) {
        full = candidat
        break
      }
      full = candidat // on garde le dernier au cas où
    }
    if (!full || full.length > MAX_BYTES) {
      throw new Error('photo-trop-lourde')
    }
    return {
      full,
      thumb: versDataUrl(source, THUMB.taille, THUMB.qualite),
      bytes: full.length,
    }
  } finally {
    source.close?.()
  }
}
