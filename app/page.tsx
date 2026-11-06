import Hero from "@/components/home/Hero";
import ClientsStrip from "@/components/home/ClientsStrip";
import SplitTiles from "@/components/home/SplitTiles";
import CentrepieceCarousel from "@/components/home/CentrepieceCarousel";
import FestiveBanner from "@/components/home/FestiveBanner";
import OccasionTiles from "@/components/home/OccasionTiles";
import ServicesGrid from "@/components/home/ServicesGrid";
import HouseSection from "@/components/home/HouseSection";

export default function HomePage() {
  return (
    <main>
      <Hero />
      <ClientsStrip />
      <SplitTiles />
      <CentrepieceCarousel />
      <FestiveBanner />
      <OccasionTiles />
      <ServicesGrid />
      <HouseSection />
    </main>
  );
}
