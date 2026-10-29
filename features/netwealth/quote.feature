@netwealth @quote @timeout:180000 @retries:1
Feature: Netwealth share quote

  Background:
    Given I am logged in to Netwealth

  Scenario: Quote search for NAB shows buy and sell prices
    When I search the quote for "NAB"
    Then "netwealthQuote.securityName" should contain text "NATIONAL AUSTRALIA BANK"
    And "netwealthQuote.buyBtn" should be visible
    And "netwealthQuote.sellBtn" should be visible
    And "netwealthQuote.bidPrice" should match "^\d+\.\d+$"
    And "netwealthQuote.offerPrice" should match "^\d+\.\d+$"
    And "netwealthQuote.marketDepth" should be visible
