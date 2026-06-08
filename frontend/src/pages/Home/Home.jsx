import styles from '../Page.module.css'

export function Home() {
  return (
    <section className={styles.page}>
      <p className={styles.eyebrow}>Gestion de talleres de motocicletas</p>
      <h1>Panel inicial de ENGINES JDS</h1>
      <p>
        Base frontend preparada para integrar modulos de clientes, motocicletas,
        ordenes de trabajo, servicios, repuestos y usuarios.
      </p>
    </section>
  )
}
