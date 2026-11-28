import { healthPortContract } from '../contracts/health-port.contract';
import { FakeHealthPort } from '../fake-health-port';

healthPortContract('FakeHealthPort', () => {
  const port = new FakeHealthPort();
  return {
    port,
    setAvailable: (available) => (port.available = available),
    setGrants: (grants) => (port.grants = grants),
    failStores: (message) => (port.storeError = message),
    stored: () => port.stored,
  };
});
