import { useCallback, useLayoutEffect, useState } from 'react';
import {
  applyOperatingEnvironment,
  isOperatingEnvironment,
  persistOperatingEnvironment,
  readOperatingEnvironment,
  type OperatingEnvironment,
} from './operatingEnvironment';

function initialEnvironment(): OperatingEnvironment {
  const preloaded = document.documentElement.dataset.environment;
  if (isOperatingEnvironment(preloaded)) return preloaded;
  return readOperatingEnvironment(window.localStorage);
}

export function useOperatingEnvironment(): [
  OperatingEnvironment,
  (environment: OperatingEnvironment) => void,
] {
  const [environment, setEnvironment] = useState<OperatingEnvironment>(initialEnvironment);

  useLayoutEffect(() => {
    applyOperatingEnvironment(document.documentElement, environment);
    persistOperatingEnvironment(window.localStorage, environment);
  }, [environment]);

  const selectEnvironment = useCallback((next: OperatingEnvironment) => {
    setEnvironment(next);
  }, []);

  return [environment, selectEnvironment];
}
