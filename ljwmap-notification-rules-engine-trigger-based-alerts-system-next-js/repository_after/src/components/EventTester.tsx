"use client";

import { useState } from "react";
import { Play, Send, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { Button, Select, Card, CardContent, CardHeader, PriorityBadge, ChannelBadge } from "./ui";
import { COMMON_EVENT_TYPES } from "@/lib/validators/event";

interface ConditionResult {
  field: string;
  operator: string;
  expected: string;
  actual: unknown;
  passed: boolean;
}

interface MatchedRule {
  id: string;
  name: string;
  description: string | null;
  priority: string;
  channels: string[];
  conditionResults: ConditionResult[];
}

interface UnmatchedRule {
  id: string;
  name: string;
  description: string | null;
  reason: string;
  conditionResults?: ConditionResult[];
}

interface TestResult {
  success: boolean;
  eventType: string;
  payload: Record<string, unknown>;
  matchedRules: MatchedRule[];
  unmatchedRules: UnmatchedRule[];
}

interface SendResult {
  success: boolean;
  event: { id: string; eventType: string };
  summary: {
    rulesEvaluated: number;
    rulesMatched: number;
    notificationsCreated: number;
  };
}

const examplePayloads: Record<string, Record<string, unknown>> = {
  order_created: {
    orderId: "ORD-12345",
    amount: 1500,
    currency: "USD",
    customer: {
      id: "CUST-001",
      email: "customer@example.com",
    },
  },
  order_status_changed: {
    orderId: "ORD-12345",
    previousStatus: "pending",
    status: "failed",
    reason: "Payment declined",
  },
  payment_failed: {
    paymentId: "PAY-67890",
    amount: 99.99,
    retryCount: 1,
    error: "Insufficient funds",
  },
  user_registered: {
    userId: "USR-111",
    email: "newuser@example.com",
    plan: "free",
  },
};

export function EventTester() {
  const [eventType, setEventType] = useState("order_status_changed");
  const [payload, setPayload] = useState(
    JSON.stringify(examplePayloads["order_status_changed"], null, 2)
  );
  const [parseError, setParseError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [sending, setSending] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [sendResult, setSendResult] = useState<SendResult | null>(null);

  const handleEventTypeChange = (newType: string) => {
    setEventType(newType);
    if (examplePayloads[newType]) {
      setPayload(JSON.stringify(examplePayloads[newType], null, 2));
    }
    setTestResult(null);
    setSendResult(null);
  };

  const validatePayload = (): Record<string, unknown> | null => {
    try {
      const parsed = JSON.parse(payload);
      setParseError(null);
      return parsed;
    } catch (e) {
      setParseError("Invalid JSON: " + (e instanceof Error ? e.message : "Unknown error"));
      return null;
    }
  };

  const handleTest = async () => {
    const parsedPayload = validatePayload();
    if (!parsedPayload) return;

    setTesting(true);
    setTestResult(null);
    setSendResult(null);

    try {
      const response = await fetch("/api/test-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventType, payload: parsedPayload }),
      });
      const data = await response.json();
      setTestResult(data);
    } catch (error) {
      setParseError("Failed to test event");
    } finally {
      setTesting(false);
    }
  };

  const handleSend = async () => {
    const parsedPayload = validatePayload();
    if (!parsedPayload) return;

    if (!confirm("This will send actual notifications. Continue?")) return;

    setSending(true);
    setSendResult(null);

    try {
      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventType, payload: parsedPayload }),
      });
      const data = await response.json();
      setSendResult(data);
    } catch (error) {
      setParseError("Failed to send event");
    } finally {
      setSending(false);
    }
  };

  const eventTypeOptions = [
    ...COMMON_EVENT_TYPES.map((e) => ({
      value: e.id,
      label: e.name,
    })),
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Input Panel */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <h3 className="text-lg font-medium">Event Configuration</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select
              id="eventType"
              label="Event Type"
              options={eventTypeOptions}
              value={eventType}
              onChange={(e) => handleEventTypeChange(e.target.value)}
            />

            <div>
              <label className="block text-sm font-medium text-black mb-1">
                Event Payload (JSON)
              </label>
              <textarea
                value={payload}
                onChange={(e) => {
                  setPayload(e.target.value);
                  setParseError(null);
                }}
                className={`w-full h-64 px-3 py-2 font-mono text-sm border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  parseError ? "border-red-500" : "border-gray-300"
                }`}
                placeholder='{"key": "value"}'
              />
              {parseError && (
                <p className="mt-1 text-sm text-red-600">{parseError}</p>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleTest}
                disabled={testing || sending}
                variant="secondary"
                className="flex-1"
              >
                <Play className="h-4 w-4 mr-2" />
                {testing ? "Testing..." : "Test Rules"}
              </Button>
              <Button
                onClick={handleSend}
                disabled={testing || sending}
                className="flex-1"
              >
                <Send className="h-4 w-4 mr-2" />
                {sending ? "Sending..." : "Send Event"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results Panel */}
      <div className="space-y-4">
        {sendResult && (
          <Card>
            <CardHeader className="bg-green-50">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                <h3 className="text-lg font-medium text-green-800">
                  Event Sent Successfully
                </h3>
              </div>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <dt className="text-sm text-black">Rules Evaluated</dt>
                  <dd className="text-2xl font-bold text-black">
                    {sendResult.summary.rulesEvaluated}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-black">Rules Matched</dt>
                  <dd className="text-2xl font-bold text-green-600">
                    {sendResult.summary.rulesMatched}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-black">Notifications</dt>
                  <dd className="text-2xl font-bold text-blue-600">
                    {sendResult.summary.notificationsCreated}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        )}

        {testResult && (
          <>
            {/* Matched Rules */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Matched Rules</h3>
                  <span className="text-sm text-black">
                    {testResult.matchedRules.length} rule(s)
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                {testResult.matchedRules.length === 0 ? (
                  <p className="text-black text-center py-4">
                    No rules matched this event
                  </p>
                ) : (
                  <div className="space-y-4">
                    {testResult.matchedRules.map((rule) => (
                      <div
                        key={rule.id}
                        className="p-4 bg-green-50 border border-green-200 rounded-lg"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <span className="font-medium text-green-800">
                            {rule.name}
                          </span>
                          <PriorityBadge priority={rule.priority} />
                          {rule.channels.map((ch) => (
                            <ChannelBadge key={ch} channel={ch} />
                          ))}
                        </div>
                        {rule.description && (
                          <p className="text-sm text-green-700 mb-2">
                            {rule.description}
                          </p>
                        )}
                        {rule.conditionResults.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {rule.conditionResults.map((cr, i) => (
                              <div
                                key={i}
                                className="text-xs font-mono bg-white/50 px-2 py-1 rounded"
                              >
                                <CheckCircle className="h-3 w-3 text-green-600 inline mr-1" />
                                {cr.field} {cr.operator} {cr.expected} (actual:{" "}
                                {JSON.stringify(cr.actual)})
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Unmatched Rules */}
            {testResult.unmatchedRules.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Unmatched Rules</h3>
                    <span className="text-sm text-black">
                      {testResult.unmatchedRules.length} rule(s)
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {testResult.unmatchedRules.map((rule) => (
                      <div
                        key={rule.id}
                        className="p-4 bg-gray-50 border border-gray-200 rounded-lg"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <XCircle className="h-5 w-5 text-gray-400" />
                          <span className="font-medium text-black">
                            {rule.name}
                          </span>
                        </div>
                        <p className="text-sm text-black">
                          <AlertTriangle className="h-3 w-3 inline mr-1" />
                          {rule.reason}
                        </p>
                        {rule.conditionResults && rule.conditionResults.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {rule.conditionResults.map((cr, i) => (
                              <div
                                key={i}
                                className={`text-xs font-mono px-2 py-1 rounded ${
                                  cr.passed
                                    ? "bg-green-50 text-green-700"
                                    : "bg-red-50 text-red-700"
                                }`}
                              >
                                {cr.passed ? (
                                  <CheckCircle className="h-3 w-3 inline mr-1" />
                                ) : (
                                  <XCircle className="h-3 w-3 inline mr-1" />
                                )}
                                {cr.field} {cr.operator} {cr.expected} (actual:{" "}
                                {JSON.stringify(cr.actual)})
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {!testResult && !sendResult && (
          <Card>
            <CardContent className="py-12 text-center text-black">
              <Play className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Click "Test Rules" to preview which rules would match,</p>
              <p>or "Send Event" to trigger actual notifications.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
