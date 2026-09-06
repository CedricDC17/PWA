// src/utils/image.js
// Réduction des photos avant envoi : une photo de téléphone pèse 3 à 8 Mo,
// ce qui prend des dizaines de secondes en 4G. Redimensionnée, elle tombe
// à quelques centaines de kilo-octets pour un rendu identique à l'écran.

const MAX_SIZE = 1600 // px sur le plus grand côté
const QUALITY = 0.82

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

/**
 * Redimensionne et recompresse une image.
 * En cas d'échec (format exotique, navigateur récalcitrant), renvoie le
 * fichier d'origine : mieux vaut un envoi lent qu'un envoi impossible.
 */
export async function compressImage(file) {
  if (!file || !file.type?.startsWith('image/')) return file

  try {
    const source = await decode(file)
    const w = source.width
    const h = source.height
    if (!w || !h) return file

    const ratio = Math.min(1, MAX_SIZE / Math.max(w, h))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(w * ratio)
    canvas.height = Math.round(h * ratio)
    canvas.getContext('2d').drawImage(source, 0, 0, canvas.width, canvas.height)
    source.close?.()

    const blob = await new Promise(resolve =>
      canvas.toBlob(resolve, 'image/jpeg', QUALITY)
    )
    if (!blob) return file

    // Si la compression n'apporte rien (petite image déjà optimisée), on garde l'original
    if (blob.size >= file.size) return file

    return new File([blob], 'photo.jpg', { type: 'image/jpeg' })
  } catch {
    return file
  }
}
