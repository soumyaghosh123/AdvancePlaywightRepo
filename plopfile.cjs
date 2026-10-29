/** npm run generate — scaffolds page objects, locators, steps, features and API services in src/app. */
const fs = require('node:fs');
const path = require('node:path');

const LOCATORS_FILE = path.join(__dirname, 'src/app/locators/locators.json');

/** Adds an empty-ish section for the page to src/app/locators/locators.json. */
function addLocatorSection(answers, _config, plop) {
  const page = plop.getHelper('camelCase')(answers.name);
  const sections = fs.existsSync(LOCATORS_FILE) ? JSON.parse(fs.readFileSync(LOCATORS_FILE, 'utf8')) : {};
  if (sections[page]) throw new Error(`locators.json already has a '${page}' section`);
  sections[page] = { exampleButton: "role=button[name='Example']" };
  fs.writeFileSync(LOCATORS_FILE, `${JSON.stringify(sections, null, 2)}\n`);
  return `src/app/locators/locators.json: added section '${page}'`;
}

module.exports = function (plop) {
  plop.setGenerator('page', {
    description: 'Page object + locators.json section + step definitions + feature skeleton',
    prompts: [{ type: 'input', name: 'name', message: 'Page name (e.g. Login, Account Summary):' }],
    actions: [
      { type: 'add', path: 'src/app/pages/{{kebabCase name}}.page.ts', templateFile: 'generators/page.hbs' },
      addLocatorSection,
      { type: 'add', path: 'src/app/step-definitions/{{kebabCase name}}.steps.ts', templateFile: 'generators/steps.hbs' },
      { type: 'add', path: 'features/{{kebabCase name}}/{{kebabCase name}}.feature', templateFile: 'generators/feature.hbs' },
    ],
  });
  plop.setGenerator('api-service', {
    description: 'REST service wrapper in src/app/api/services',
    prompts: [{ type: 'input', name: 'name', message: 'Service name (e.g. Orders):' }],
    actions: [
      { type: 'add', path: 'src/app/api/services/{{kebabCase name}}.service.ts', templateFile: 'generators/api-service.hbs' },
    ],
  });
};
