@samples @smoke
Feature: Sample smoke

  Scenario: Sample login page opens
    Given I open url "http://localhost:3999/sample/login"
    Then the page title should contain "Sample Login"
