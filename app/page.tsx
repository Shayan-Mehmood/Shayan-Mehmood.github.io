import { Hero } from "@/components/hero/Hero";
import { Agentic } from "@/components/agentic/Agentic";
import { Showcase } from "@/components/showcase/Showcase";
import { SpatialTimeline } from "@/components/timeline/SpatialTimeline";
import { Contact } from "@/components/contact/Contact";

export default function Home() {
  return (
    <main>
      <Hero />
      <Agentic />
      <Showcase />
      <SpatialTimeline />
      <Contact />
    </main>
  );
}
