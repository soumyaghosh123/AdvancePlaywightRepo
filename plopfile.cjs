/** npm run generate — scaffolds page objects, locators, steps, features and API services in src/app. */
module.exports = function (plop) {
  plop.setGenerator('page', {
    description: 'Page object + locator file + step definitions + feature skeleton',
    prompts: [{ type: 'input', name: 'name', message: 'Page name (e.g. Login, Account Summary):' }],
    actions: [
      { type: 'add', path: 'src/app/pages/{{kebabCase name}}.page.ts', templateFile: 'generators/page.hbs' },
      { type: 'add', path: 'src/app/locators/{{camelCase name}}.locators.json', templateFile: 'generators/locators.hbs' },
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
