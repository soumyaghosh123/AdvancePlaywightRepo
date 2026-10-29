@samples @login
Feature: Sample login

  Scenario: Valid user can log in
    Given I open the "sampleLogin" page
    When I enter "${data.users.valid.username}" into "sampleLogin.username"
    And I enter "${env.SAMPLE_PASSWORD}" into "sampleLogin.password"
    And I click "sampleLogin.loginBtn"
    Then "sampleSecure.flash" should contain text "secure area"
    And "sampleSecure.heading" should have text "Secure Area"
    And the url should contain "/sample/secure"
    When I store text of "sampleSecure.heading" as "heading"
    Then stored value "heading" should be "Secure Area"

  Scenario Outline: Invalid username <username> is rejected
    Given I open the "sampleLogin" page
    When I enter "<username>" into "sampleLogin.username"
    And I enter "wrong" into "sampleLogin.password"
    And I click "sampleLogin.loginBtn"
    Then "sampleLogin.flash" should have text "Your username is invalid!"
    And "sampleSecure.logout" should be hidden

    Examples:
      | username                   |
      | nobody                     |
      | ${faker.internet.username} |
