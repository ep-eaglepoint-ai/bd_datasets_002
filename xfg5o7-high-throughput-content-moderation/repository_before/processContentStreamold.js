function processContentStream(streamBatch, blocklistRules) {
  const processedEvents = [];
  const now = new Date(); // Current server time

  // Loop through incoming event batch
  for (let i = 0; i < streamBatch.length; i++) {
    const event = streamBatch[i];
    
    // HEAVY OPERATION 1: Regex replacement and casing on every event
    const rawBody = event.body || "";
    const normalized = rawBody.replace(/[^\w\s]/gi, '').toLowerCase();
    
    let highestRisk = 0;
    let matchedCategories = [];
    let shouldBlock = false;

    // HEAVY OPERATION 2: Nested loop over entire ruleset (O(N * M))
    for (let j = 0; j < blocklistRules.length; j++) {
      const rule = blocklistRules[j];
      
      if (!rule.isActive) continue;
      
      // HEAVY OPERATION 3: Date object allocation inside nested loop
      const ruleExpiry = new Date(rule.expiresAt); 
      if (ruleExpiry < now) continue;

      // HEAVY OPERATION 4: Linear substring scan
      if (normalized.includes(rule.token.toLowerCase())) {
         
         // HEAVY OPERATION 5: Array scan inside nested loop
         if (rule.targetRegions.includes(event.region)) {
             shouldBlock = true;
             highestRisk = Math.max(highestRisk, rule.riskLevel);
             
             // HEAVY OPERATION 6: Linear check and push
             if (!matchedCategories.includes(rule.category)) {
                 matchedCategories.push(rule.category);
             }
         }
      }
    }

    if (shouldBlock) {
      processedEvents.push({
        eventId: event.id,
        timestamp: event.timestamp,
        riskScore: highestRisk,
        categories: matchedCategories.join(","),
        // HEAVY OPERATION 7: Deep cloning for every flagged event
        originalData: JSON.parse(JSON.stringify(event)) 
      });
    }
  }

  return processedEvents.sort((a, b) => b.riskScore - a.riskScore);
}