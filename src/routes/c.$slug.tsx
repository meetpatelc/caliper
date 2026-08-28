import { createFileRoute, redirect } from "@tanstack/react-router";
import { PARENT_NAME } from "@/lib/instrument";
import { CalculatorFrame } from "@/studio/components/calculator-frame";
import { findCalculator } from "@/studio/lib/resolve";
import { useWorkshop } from "@/studio/lib/workshop-store";
import { MissingPage, PageLoading } from "@/components/missing-page";

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
  // Deliberately not notFound(): this slug may name a Studio calculator that
  // exists only in the visitor's browser, so the server cannot know whether the
  // resource is real. 200 is the honest answer. A title is still owed — without
  // one every short link, live or dead, showed the bare app name.
  head: ({ params }) => ({ meta: [{ title: `${params.slug} · ${PARENT_NAME}` }] }),
  component: CalculatorPage,
});

function CalculatorPage() {
  const { slug } = Route.useParams();
  const workshop = useWorkshop((state) => state.items);
  const hasHydrated = useWorkshop((state) => state.hasHydrated);
  const calculator = findCalculator(slug, workshop);

  if (!hasHydrated && !calculator) {
    return <PageLoading kicker="Instrument" />;
  }

  if (!calculator) {
    return (
      <MissingPage
        kicker="Missing instrument"
        title="That instrument is not here."
        to="/"
        backLabel="Back to library"
      />
    );
  }

  return <CalculatorFrame calculator={calculator} />;
}
