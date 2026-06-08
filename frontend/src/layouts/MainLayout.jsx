import { Outlet } from 'react-router-dom'
import { Navbar } from '../components/Navbar/Navbar'
import styles from './MainLayout.module.css'

export function MainLayout() {
  return (
    <div className={styles.appShell}>
      <Navbar />
      <main className={styles.mainContent}>
        <Outlet />
      </main>
    </div>
  )
}
