import * as SettingsModel from '../models/settings.model.js'
import { logAudit } from './audit.service.js'

export async function get() {
  return SettingsModel.get()
}

export async function update(data, actor = {}) {
  const updated = await SettingsModel.update(data)

  await logAudit('UPDATE_SETTINGS', {
    userId: actor.userId, userName: actor.userName, role: actor.role, ipAddress: actor.ip,
    tableName: 'settings', recordId: 1,
    description: `Configuración del sistema actualizada`,
  })

  return updated
}

export async function updateLogo(logoUrl, actor = {}) {
  const updated = await SettingsModel.update({ logo_url: logoUrl })

  await logAudit('CHANGE_LOGO', {
    userId: actor.userId, userName: actor.userName, role: actor.role, ipAddress: actor.ip,
    tableName: 'settings', recordId: 1,
    description: `Logo del taller actualizado`,
  })

  return updated
}
