/** Public API of the framework core for code in src/app. */
export { BasePage } from './pages/BasePage';
export { CommonUtils } from './utils/CommonUtils';
export { WaitUtils, type Target, type WaitUtilsOptions } from './utils/WaitUtils';
export { ScenarioContext } from './support/ScenarioContext';
export { LocatorRepository, type FallbackEvent } from './locators/LocatorRepository';
export { getConfig, getSecret, loadConfig } from './config/loadConfig';
export type { FrameworkConfig, RunProfile, BrowserName } from './config/schema';
export { TestDataManager } from './data/TestDataManager';
export { interpolate } from './data/interpolate';
export * from './errors';
export { test, Given, When, Then, Before, After, BeforeAll, AfterAll } from './fixtures';
