import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import mysql from 'mysql2/promise'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const envPath = process.env.MIGRATION_ENV_FILE ?? path.join(projectRoot, 'backend', '.env.production')
dotenv.config({ path: envPath })

const files = [
  '27_motorcycle_status_simplify.sql',
  '28_inventory_categories_simplify.sql',
  '29_fix_employee_performance_view.sql',
]

const conn = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL === 'true' ? { minVersion: 'TLSv1.2', rejectUnauthorized: true } : undefined,
  multipleStatements: true,
})

for (const file of files) {
  const sql = fs.readFileSync(path.join(projectRoot, 'database', file), 'utf8')
  await conn.query(sql)
  console.log(`Applied: ${file}`)
}

console.log('All migrations applied successfully to Aiven production.')
await conn.end()
