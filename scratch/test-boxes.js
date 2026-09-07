const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testBoxes() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('No GEMINI_API_KEY set.');
    return;
  }
  
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  
  // Use one of the uploaded artifacts
  const imagePath = path.join(__dirname, '..', '.user_uploaded', 'media_1788804931664.png');
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Data = imageBuffer.toString('base64');
  
  const prompt = `
You are an expert OCR vision assistant.
Detect the marked answers for questions 1 to 5 on this multiple choice answer sheet.
For each detected answer, provide the bounding box in [ymin, xmin, ymax, xmax] format where coordinates are normalized integers between 0 and 1000.
Return a JSON array of objects with schema:
[
  {
    "id": number,
    "detected": string,
    "box_2d": [number, number, number, number]
  }
]
`;
  
  const result = await model.generateContent({
    contents: [
      { text: prompt },
      {
        inlineData: {
          mimeType: "image/png",
          data: base64Data
        }
      }
    ],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.1
    }
  });
  
  console.log(result.response.text());
}

testBoxes();
