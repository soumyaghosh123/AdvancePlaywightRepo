@samples
Feature: Sample table

  Scenario: Rows, dropdown and new tab
    Given I open the "sampleTable" page
    Then "sampleTable.rowByName(Jane)" should be visible
    And "sampleTable.rows" should have count 3
    When I select "India" from "sampleTable.country"
    Then "sampleTable.country" should have value "in"
    When I click "sampleTable.newTabLink" and switch to the new tab
    Then "sampleSecure.heading" should have text "Secure Area"
    And I take a screenshot named "secure-tab"
