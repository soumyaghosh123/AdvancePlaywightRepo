@google
Feature: Google home page

  Scenario: Click the I'm Feeling Lucky button
    Given I open the "google" page
    When I click "google.luckyButton"
    Then the url should contain "doodles"
