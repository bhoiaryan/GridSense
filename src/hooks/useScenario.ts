import { useCallback, useEffect, useState } from "react";
import { api } from "../services/api";
import type { ScenarioInput, ScenarioResult } from "../types";

const baselineInput: ScenarioInput = {
  cloudCoverChange: 0,
  demandChange: 0,
  batteryAvailable: true,
  backupAvailable: true,
};

const defaultInput: ScenarioInput = {
  cloudCoverChange: 20,
  demandChange: 10,
  batteryAvailable: true,
  backupAvailable: true
};

export function useScenario() {
  const [input, setInput] = useState<ScenarioInput>(defaultInput);
  const [baseline, setBaseline] = useState<ScenarioResult | null>(null);
  const [result, setResult] = useState<ScenarioResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadInitialResults = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [baselineResult, scenarioResult] = await Promise.all([
        api.simulate(baselineInput),
        api.simulate(defaultInput),
      ]);
      setBaseline(baselineResult);
      setResult(scenarioResult);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to run the initial simulation.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInitialResults();
  }, [loadInitialResults]);

  const runSimulation = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      setResult(await api.simulate(input));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to run this scenario.");
    } finally {
      setIsLoading(false);
    }
  }, [input]);

  return {
    baseline,
    input,
    result,
    setInput,
    isLoading,
    error,
    runSimulation,
    retry: loadInitialResults,
  };
}
