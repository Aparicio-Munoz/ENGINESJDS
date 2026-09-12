const KEY = 'sgtm_taller_config'
const LEGACY_KEY = 'engines_jds_taller_config'

const DEFAULTS = {
  nombre: 'SGTM',
  direccion: '',
  telefono: '',
  whatsapp: '',
  email: '',
  horaApertura: '08:00',
  horaCierre: '18:00',
  duracionCita: 60,
  intervaloCita: 30,
  stockMinimo: 5,
  diasTecno: 30,
}

export function getTallerConfig() {
  try {
    const stored = localStorage.getItem(KEY) ?? localStorage.getItem(LEGACY_KEY)
    if (!localStorage.getItem(KEY) && stored) {
      localStorage.setItem(KEY, stored)
      localStorage.removeItem(LEGACY_KEY)
    }
    return stored ? { ...DEFAULTS, ...JSON.parse(stored) } : { ...DEFAULTS }
  } catch {
    return { ...DEFAULTS }
  }
}

export function saveTallerConfig(config) {
  localStorage.setItem(KEY, JSON.stringify(config))
}
