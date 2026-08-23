import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { CalculatorFrame } from "@/gauge/components/calculator-frame";
import { Iso286Instrument } from "@/gauge/components/iso-286";
import { type OfficialCalculator } from "@/gauge/lib/calculator-types";
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

  const isIso = calculator.origin === "official" && (calculator as OfficialCalculator).engine === "iso286";

  if (isIso) {
    return (
      <div className="page-wrap">
        <Iso286Instrument calculator={calculator as OfficialCalculator} />
      </div>
    );
  }

  return <CalculatorFrame calculator={calculator} />;
}
