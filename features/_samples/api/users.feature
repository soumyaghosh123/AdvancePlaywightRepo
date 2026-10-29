@api @samples
Feature: Sample users API

  Scenario: Create a user and read it back
    Given I use API "sample" with auth "oauth2"
    When I send POST to "/users" with body "createUser.json"
    Then response status should be 201
    And response should match schema "user.schema.json"
    And response path "$.id" should not be empty
    When I store response path "$.id" as "userId"
    And I send GET to "/users/${ctx.userId}"
    Then response status should be 200
    And response path "$.id" should be "${ctx.userId}"

  Scenario: Request without a token is rejected
    Given I use API "sample"
    When I send POST to "/users" with body '{"name":"anon"}'
    Then response status should be 401
