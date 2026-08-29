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
  // Deliberately not notFound(): `findCalculator` falls back to the visitor's
  // own Studio calculators, which live in their browser, so the server cannot
  // know whether the resource is real. Answering 404 would break someone
  // opening their own work from a short link. 200 is the honest answer.
  //
  // What 200 costs is indexing: a dead short link renders "That instrument is
  // not here" under a 200 and a crawler files it as a thin page. `noindex`
  // settles that without lying about the status, and applies to every short
  // link rather than only the dead ones — these address one person's saved
  // work, and none of them are content anyone should reach from a search.
  //
  // A title is still owed. Without one every short link, live or dead, showed
  // the bare app name.
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} · ${PARENT_NAME}` },
      { name: "robots", content: "noindex" },
    ],
  }),
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
