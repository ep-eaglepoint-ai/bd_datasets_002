import { RuleForm } from "@/components/RuleForm";

export default function NewRulePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-black">Create New Rule</h1>
        <p className="mt-1 text-sm text-black">
          Define a new notification rule with conditions and delivery channels
        </p>
      </div>
      
      <RuleForm />
    </div>
  );
}
