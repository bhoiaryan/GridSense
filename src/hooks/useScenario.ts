import { useMemo, useState } from "react";
import { runScenario, scenarioBaseline } from "../data/mockData";
import type { ScenarioInput } from "../types";

const defaultInput: ScenarioInput = {
  cloudCoverChange: 20,
  demandChange: 10,
  batteryAvailable: true,
  backupAvailable: true
};

export function useScenario() {
  const [input, setInput] = useState<ScenarioInput>(defaultInput);
  const result = useMemo(() => runScenario(input), [input]);

  return {
    baseline: scenarioBaseline,
    input,
    result,
    setInput
  };
}
