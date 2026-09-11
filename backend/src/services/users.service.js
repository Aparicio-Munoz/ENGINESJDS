import bcrypt from 'bcryptjs'
import { getPool } from '../config/database.js'
import { getTenantContext } from '../config/requestContext.js'
import * as PlatformModel from '../models/platform.model.js'
import * as UserModel from '../models/user.model.js'
import { ApiError } from '../utils/ApiError.js'

export async function getAll(filters = {}) {
  return UserModel.findAll(filters)
}

export async function getById(id) {
  const user = await UserModel.findById(id)
  if (!user) throw ApiError.notFound('Usuario no encontrado')
  return user
}

export async function create({ username, email, password, role, status = 'Activo' }) {
  if (await UserModel.emailExists(email)) {
    throw ApiError.conflict('El correo electrónico ya está registrado')
  }
  if (await UserModel.usernameExists(username)) {
    throw ApiError.conflict('El nombre de usuario ya está en uso')
  }

  const roleRecord = await UserModel.findRoleByName(role)
  if (!roleRecord) throw ApiError.badRequest(`Rol "${role}" no existe en el sistema`)

  const rounds = Number(process.env.BCRYPT_ROUNDS ?? 12)
  const password_hash = await bcrypt.hash(password, rounds)
  const tenant = getTenantContext()

  if (tenant && await PlatformModel.findAccountByEmail(email)) {
    throw ApiError.conflict('El correo electrónico ya está registrado')
  }

  const user = await UserModel.create({ role_id: roleRecord.id, username, email, password_hash, status })

  if (tenant) {
    try {
      await PlatformModel.createAccount({
        tenantId: tenant.tenantId,
        username,
        email,
        passwordHash: password_hash,
        role,
        status,
      })
    } catch (error) {
      await UserModel.remove(user.id)
      throw error
    }
  }

  return user
}

export async function update(id, { username, email, role, status }) {
  const user = await getById(id)
  const fields = {}
  const tenant = getTenantContext()

  if (email !== undefined) {
    if (await UserModel.emailExists(email, id)) {
      throw ApiError.conflict('El correo electrónico ya está registrado')
    }
    if (tenant && email !== user.email && await PlatformModel.findAccountByEmail(email)) {
      throw ApiError.conflict('El correo electrónico ya está registrado')
    }
    fields.email = email
  }
  if (username !== undefined) {
    if (await UserModel.usernameExists(username, id)) {
      throw ApiError.conflict('El nombre de usuario ya está en uso')
    }
    fields.username = username
  }
  if (role !== undefined) {
    const roleRecord = await UserModel.findRoleByName(role)
    if (!roleRecord) throw ApiError.badRequest(`Rol "${role}" no existe en el sistema`)

    // Evitar que el último admin activo quede sin rol de Administrador
    if (user.role === 'Administrador' && role !== 'Administrador') {
      const remaining = await UserModel.countAdmins(id)
      if (remaining === 0) {
        throw ApiError.conflict('No puedes cambiar el rol del último administrador activo')
      }
    }
    fields.role_id = roleRecord.id
  }
  if (status !== undefined) {
    // Evitar desactivar el último admin
    if (user.role === 'Administrador' && status === 'Inactivo') {
      const remaining = await UserModel.countAdmins(id)
      if (remaining === 0) {
        throw ApiError.conflict('No puedes desactivar el último administrador del sistema')
      }
    }
    fields.status = status
  }

  const updated = await UserModel.update(id, fields)

  if (tenant) {
    await PlatformModel.updateAccount({
      tenantId: tenant.tenantId,
      oldEmail: user.email,
      username: fields.username,
      email: fields.email,
      role,
      status,
    })
  }

  return updated
}

export async function remove(id, deletedById, reason) {
  if (!reason?.trim()) {
    throw ApiError.badRequest('El motivo de eliminación es requerido')
  }

  const user = await getById(id)
  const tenant = getTenantContext()

  // Proteger al último administrador
  if (user.role === 'Administrador') {
    const remaining = await UserModel.countAdmins(id)
    if (remaining === 0) {
      throw ApiError.conflict('No puedes eliminar el último administrador del sistema')
    }
  }

  // Registrar en deletion_logs antes de eliminar
  await getPool().query(
    `INSERT INTO deletion_logs
       (entity_type, entity_id, entity_label, entity_data, reason, deleted_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    ['users', id, user.username, JSON.stringify(user), reason.trim(), deletedById]
  )

  await UserModel.remove(id)
  if (tenant) {
    await PlatformModel.removeAccount(tenant.tenantId, user.email)
  }
}

export async function resetPassword(id, newPassword) {
  const user = await getById(id)
  const rounds = Number(process.env.BCRYPT_ROUNDS ?? 12)
  const password_hash = await bcrypt.hash(newPassword, rounds)
  const tenant = getTenantContext()
  if (tenant) {
    await PlatformModel.updateAccountPassword(tenant.tenantId, user.email, password_hash)
  }
  await UserModel.updatePassword(id, password_hash)
}
