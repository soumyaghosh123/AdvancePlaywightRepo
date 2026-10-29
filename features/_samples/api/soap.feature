@api @samples
Feature: Sample SOAP service

  Scenario: Echo service returns the message
    When I send SOAP request "echo.xml" to "SOAP_SAMPLE_URL" with action "urn:Echo"
    Then SOAP node "Status" should be "OK"
    And SOAP node "EchoResponse.Message" should be "tomsmith"
    When I store SOAP node "Message" as "echoed"
    Then stored value "echoed" should be "tomsmith"
