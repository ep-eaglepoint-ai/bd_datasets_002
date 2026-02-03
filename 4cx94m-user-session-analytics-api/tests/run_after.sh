#!/usr/bin/env bash
set -euo pipefail

echo "Running repository_after Maven tests and listing individual test names..."

# Remove previous surefire reports to avoid stale results, then run tests
rm -rf repository_after/target/surefire-reports || true
rm -rf repository_after/target/surefire-reports/* || true
# Run Maven tests (show normal output)
mvn -f repository_after/pom.xml test

if [ ! -d repository_after/target/surefire-reports ]; then
  echo "No surefire reports found" >&2
  exit 1
fi

echo
echo "Test results (per test case):"
fail_count=0
for f in repository_after/target/surefire-reports/TEST-*.xml; do
  # Use process substitution so the while loop runs in the current shell
  while IFS='|' read -r status name cls; do
    printf "[%s] %s (%s)\n" "$status" "$name" "$cls"
    if [ "$status" = "FAIL" ]; then
      fail_count=$((fail_count+1))
    fi
  done < <(
    awk 'BEGIN{RS="</testcase>"}
      /<testcase /{
        name=""; cls=""; status="PASS";
        if (match($0,/name="[^"]+"/)) name=substr($0,RSTART+6,RLENGTH-6);
        if (match($0,/classname="[^"]+"/)) cls=substr($0,RSTART+11,RLENGTH-11);
        if ($0 ~ /<failure/ || $0 ~ /<error/) status="FAIL";
        printf "%s|%s|%s\n", status, name, cls;
      }
    ' "$f"
  )
  
done

echo
echo "Summary: $fail_count failing test(s)"
if [ $fail_count -gt 0 ]; then
  exit 1
fi

exit 0
