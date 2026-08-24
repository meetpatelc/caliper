import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { CalculatorFrame } from "@/studio/components/calculator-frame";
import { findCalculator } from "@/studio/lib/resolve";
import { useWorkshop } from "@/studio/lib/workshop-store";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/status";

export const Route = createFileRoute("/c/$slug")({
  beforeLoad: ({ params }) => {
    const library = {
      "axial-stress": "axial",
      "kinetic-energy": "kinetic",
      "force-mass-accel": "newton",
      "beam-deflection": "beam",
      "shaft-torsion": "torsion",
      "reynolds-number": "reynoldsNumber",
      "sensible-heat": "sensibleHeat",
      "plane-conduction": "planeConduction",
      "ohm-power": "ohm",
      "three-phase-power": "threePhasePower",
      "gravitational-pe": "gravitationalPe",
      "pipe-velocity": "pipeVelocity",
      "dynamic-pressure": "dynamicPressure",
      "iso-286-fits": "fits",
      "hoop-stress": "thinVessel",
      "helical-spring": "compressionSpring",
    } as const;
    const toolId = library[params.slug as keyof typeof library];
    if (toolId) {
      throw redirect({ to: "/tool/$toolId", params: { toolId } });
    }
  },
  component: CalculatorPage,
});

function CalculatorPage() {
  const { slug } = Route.useParams();
  const workshop = useWorkshop((state) => state.items);
  const hasHydrated = useWorkshop((state) => state.hasHydrated);
  const calculator = findCalculator(slug, workshop);

  if (!hasHydrated && !calculator) {
    return (
      <div className="page-wrap">
        <p className="eyebrow">Instrument</p>
        <LoadingState variant="block" className="mt-6" />
      </div>
    );
  }

  if (!calculator) {
    return (
      <div className="page-wrap max-w-xl">
        <p className="eyebrow">Missing instrument</p>
        <h1 className="display-title mt-3">That instrument is not here.</h1>
        <Button asChild variant="ghost" className="mt-4">
          <Link to="/">Back to library</Link>
        </Button>
      </div>
    );
  }

  return <CalculatorFrame calculator={calculator} />;
}
