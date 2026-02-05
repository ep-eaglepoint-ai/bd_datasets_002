import { EventTester } from "@/components/EventTester";

export default function TestPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-black">Test Event</h1>
        <p className="mt-1 text-sm text-black">
          Test events against your rules to see which ones would trigger
        </p>
      </div>
      
      <EventTester />
    </div>
  );
}
