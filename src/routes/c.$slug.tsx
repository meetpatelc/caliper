import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { CalculatorFrame } from "@/gauge/components/calculator-frame";
import { findCalculator } from "@/gauge/lib/resolve";
import { useWorkshop } from "@/gauge/lib/workshop-store";
import { buttonVariants } from "@instrument/ui";

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
  const calculator = findCalculator(slug, workshop);

  if (!calculator) {
    return (
      <div className="page-wrap max-w-xl">
        <p className="eyebrow">Missing instrument</p>
        <h1 className="display-title mt-3">That instrument is not here.</h1>
        <Link to="/" className={buttonVariants({ variant: "ghost" })}>
          Back to library
        </Link>
      </div>
    );
  }

  return <CalculatorFrame calculator={calculator} />;
}
