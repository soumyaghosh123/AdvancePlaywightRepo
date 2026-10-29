import { test, expect } from '@playwright/test';
import { ConfigError } from '@core/errors';

test('alias resolves', () => {
  expect(new ConfigError('x').name).toBe('ConfigError');
});
