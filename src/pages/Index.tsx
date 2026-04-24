import Navbar from "@/components/Navbar";
import Services from "./Services";

export default function Index() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <Services />
      </main>
    </div>
  );
}
