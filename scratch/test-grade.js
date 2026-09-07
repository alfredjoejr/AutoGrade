require('dotenv').config({ path: '.env.local' });
const { generateVisionContentWithFallback } = require('./lib/vision-ai.ts');
const fs = require('fs');

async function testGrade() {
  // Use a mock response to test the grading logic in route.ts
  const aiResults = [
    { id: 1, detected: "A", confidence: 0.95 },
    { id: 2, detected: "B", confidence: 1 },
    { id: 3, detected: null, confidence: 0 },
    { id: 23, detected: "A,B", confidence: 0.6 }
  ];

  const masterKey = { "1": "A", "2": "B", "3": "C", "23": "D" };
  const threshold = 75;

  const finalResults = aiResults.map((result) => {
    const qId = typeof result.id === "number" ? result.id : parseInt(String(result.id).replace(/\D/g, ""), 10);
    const correct = masterKey[qId] || masterKey[String(qId)] || "A";
    
    const rawConf = typeof result.confidence === "number" ? result.confidence : parseFloat(result.confidence) || 0;
    const confidence = rawConf <= 1 && rawConf > 0 ? Math.round(rawConf * 100) : Math.round(rawConf);

    const detectedStr = result.detected ? String(result.detected).trim().toUpperCase() : null;
    const correctStr = String(correct).trim().toUpperCase();

    let status = 'incorrect';
    const isMultiMark = detectedStr && detectedStr.includes(',');
    const isBlank = detectedStr === null || detectedStr === '';

    if (isBlank || isMultiMark || confidence < threshold) {
      status = 'ambiguous';
    } else if (detectedStr === correctStr) {
      status = 'correct';
    }

    return { id: qId, detected: result.detected, correct: correct, status, confidence };
  });

  console.log(finalResults);
}

testGrade();
