const KEY = 'engines_jds_taller_config'

const DEFAULTS = {
  nombre: 'ENGINES JDS',
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
    const stored = localStorage.getItem(KEY)
    return stored ? { ...DEFAULTS, ...JSON.parse(stored) } : { ...DEFAULTS }
  } catch {
    return { ...DEFAULTS }
  }
}

export function saveTallerConfig(config) {
  localStorage.setItem(KEY, JSON.stringify(config))
}
