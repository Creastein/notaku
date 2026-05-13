const { GoogleGenerativeAI } = require("@google/generative-ai");

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY is not set");
    return;
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  try {
    const models = await genAI.listModels();
    console.log(JSON.stringify(models, null, 2));
  } catch (error) {
    console.error("Error listing models:", error);
  }
}

listModels();

