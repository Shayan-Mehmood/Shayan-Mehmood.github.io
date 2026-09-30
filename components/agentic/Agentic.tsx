import { AgenticGraph } from "./AgenticGraph";
import styles from "./Agentic.module.css";

export function Agentic() {
  return (
    <section id="agentic" className={styles.section} aria-label="Agentic workflow architecture">
      <AgenticGraph />
    </section>
  );
}
