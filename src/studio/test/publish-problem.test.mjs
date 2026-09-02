import { strict as assert } from "node:assert";
import test from "node:test";
import { calculatorSchema } from "@/studio/lib/calculator-types.ts";
import { publishProblem, publishProblems, publishProblemSummary } from "@/studio/lib/publish-problem.ts";

/**
 * A model that publishes cleanly, so each case can break exactly one thing.
 * Loosely typed on purpose: every case here is a deliberate schema violation.
 *
 * @returns {Record<string, any>}
 */
function validCalculator() {
  return {
    slug: "compression-spring-preload",
    title: "Compression Spring Preload",
    description: "Preload force and working length for a linear compression spring.",
    domain: "mechanics",
    fields: [
      { id: "k", label: "Spring rate", family: "stiffness", defaultValue: 10, defaultUnit: "N/mm" },
      { id: "L_free", label: "Free length", family: "length", defaultValue: 50, defaultUnit: "mm" },
    ],
    outputs: [
      { id: "dx_p", label: "Preload deflection", family: "length", defaultUnit: "mm", expression: "L_free - k" },
    ],
    formula: "F = k * x",
    purpose: "Find the preload force and the clearance to solid.",
    assumptions: ["Linear rate over the working range."],
    boundary: "Not valid past solid height.",
    interpretation: "Preload force at the installed length.",
    sourceLabel: "Author",
    sourceUrl: "",
    related: [],
  };
}

/**
 * @param {(draft: Record<string, any>) => void} mutate
 * @returns {string}
 */
function firstProblem(mutate) {
  const draft = validCalculator();
  mutate(draft);
  const parsed = calculatorSchema.safeParse(draft);
  assert.equal(parsed.success, false, "the mutation was supposed to break the schema");
  return publishProblem(parsed.error.issues[0], draft);
}

test("the baseline publishes", () => {
  assert.equal(calculatorSchema.safeParse(validCalculator()).success, true);
});

test("a drafted calculator names its blank source label", () => {
  // What the user actually hit: the accept path leaves `sourceLabel` empty
  // because a model has no source to cite, and Publish said "Invalid input".
  assert.equal(
    firstProblem((draft) => {
      draft.sourceLabel = "";
    }),
    "Source label is required.",
  );
});

test("no message is a bare zod predicate", () => {
  /** @type {((draft: Record<string, any>) => void)[]} */
  const cases = [
    (draft) => {
      draft.sourceLabel = "";
    },
    (draft) => {
      draft.purpose = "";
    },
    (draft) => {
      draft.assumptions = [];
    },
    (draft) => {
      draft.description = "";
    },
    (draft) => {
      draft.title = "x".repeat(200);
    },
    (draft) => {
      delete draft.boundary;
    },
    (draft) => {
      draft.fields[0].label = "";
    },
  ];

  for (const mutate of cases) {
    const message = firstProblem(mutate);
    assert.ok(!message.startsWith("Too small"), `still raw: ${message}`);
    assert.ok(!message.startsWith("Too big"), `still raw: ${message}`);
    assert.ok(!message.startsWith("Invalid input"), `still raw: ${message}`);
    assert.ok(/^[A-Z]/.test(message), `should open with a field name: ${message}`);
  }
});

test("purpose asks for a length, not for arithmetic", () => {
  assert.equal(
    firstProblem((draft) => {
      draft.purpose = "short";
    }),
    "Purpose needs at least 8 characters.",
  );
});

test("an empty list asks for an entry", () => {
  assert.equal(
    firstProblem((draft) => {
      draft.assumptions = [];
    }),
    "Assumptions needs at least one entry.",
  );
});

test("a row is numbered the way the panel numbers it", () => {
  const message = firstProblem((draft) => {
    draft.outputs[0].label = "";
  });
  assert.match(message, /^Result 1 /, message);
});

test("our own messages are passed through", () => {
  const message = firstProblem((draft) => {
    draft.slug = "Not A Slug";
  });
  assert.equal(message, "Address — Use a lowercase slug.");
});

test("a missing key says so", () => {
  assert.equal(
    firstProblem((draft) => {
      delete draft.interpretation;
    }),
    "How to read the result is missing.",
  );
});

test("no issue at all still says something useful", () => {
  assert.equal(publishProblem(undefined), "Finish the instrument before publishing.");
});

test("publishing reports every problem, not just the first", () => {
  // It reported issues[0] and stopped, so a draft missing three things took
  // three attempts to discover them -- fix one, press Publish, meet the next.
  /** @type {any[]} */
  const issues = [
    { path: ["title"], message: "Too small: expected string to have >=1 characters", code: "too_small" },
    { path: ["fields", 0, "unit"], message: "Required", code: "invalid_type" },
    { path: ["formula"], message: "Required", code: "invalid_type" },
  ];
  const problems = publishProblems(issues, {});
  assert.equal(problems.length, 3);
});

test("the same complaint about four fields is said once", () => {
  /** @type {any[]} */
  const issues = [0, 1, 2, 3].map((index) => ({
    path: ["fields", index, "unit"],
    message: "Required",
    code: "invalid_type",
  }));
  const problems = publishProblems(issues, {});
  assert.equal(new Set(problems).size, problems.length, "messages were not deduplicated");
});

test("an empty issue list still says something", () => {
  // Publish cannot fail with nothing to report, but a toast reading
  // "undefined" is the worse failure of the two.
  const problems = publishProblems([], {});
  assert.equal(problems.length, 1);
  assert.match(problems[0], /\S/);
});

test("the first problem leads and the rest are counted", () => {
  const summary = publishProblemSummary(["A missing.", "B missing.", "C missing."]);
  assert.equal(summary.title, "A missing.");
  assert.match(String(summary.description), /^2 more to fix\./);
  assert.match(String(summary.description), /B missing\./);
});

test("one problem has no description at all", () => {
  const summary = publishProblemSummary(["Only this."]);
  assert.equal(summary.title, "Only this.");
  assert.equal(summary.description, undefined);
});

test("a long list is trimmed rather than filling the screen", () => {
  const many = ["1.", "2.", "3.", "4.", "5.", "6."];
  const summary = publishProblemSummary(many);
  assert.match(String(summary.description), /5 more to fix\./);
  assert.match(String(summary.description), /And 2 more\./);
  assert.ok(!String(summary.description).includes("6."), "listed every problem instead of trimming");
});
