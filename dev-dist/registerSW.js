// main.js ou index.js
import { registerSW } from 'virtual:pwa-register'

const updateSW = registerSW({
    onRegistered(r) {
        // vérifie toutes les heures
        setInterval(() => r && r.update(), 60 * 60 * 1000)
    },
    onNeedRefresh() {
        // quand une nouvelle version est dispo, on la switche
        updateSW()
    }
})


if ('serviceWorker' in navigator) navigator.serviceWorker.register('/dev-sw.js?dev-sw', { scope: '/', type: 'classic' })