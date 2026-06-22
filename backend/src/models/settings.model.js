import { getPool } from '../config/database.js'

export async function get() {
  const [rows] = await getPool().query('SELECT * FROM settings WHERE id = 1')
  return rows[0] ?? null
}

export async function update(fields) {
  const allowed = [
    'business_name', 'slogan', 'logo_url', 'address', 'phone', 'email',
    'website', 'facebook', 'instagram', 'whatsapp', 'working_hours',
    'currency', 'tax_percent', 'primary_color', 'secondary_color',
    'footer_message', 'signature_name', 'signature_position',
  ]
  const sets = []; const params = []
  for (const key of allowed) {
    if (fields[key] !== undefined) {
      const val = key === 'working_hours' && typeof fields[key] === 'object'
        ? JSON.stringify(fields[key])
        : fields[key]
      sets.push(`${key} = ?`); params.push(val)
    }
  }
  if (!sets.length) return get()
  params.push(1)
  await getPool().query(`UPDATE settings SET ${sets.join(', ')} WHERE id = ?`, params)
  return get()
}
