const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require("dotenv");
dotenv.config({ path: ".env.local" });

const apiKey = process.env.GEMINI_API_KEY || "";

async function testModel(modelName, apiVersion) {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const options = { model: modelName };
    const requestOptions = apiVersion ? { apiVersion } : undefined;
    
    const model = genAI.getGenerativeModel(options, requestOptions);
    console.log(`Testing model: ${modelName} with apiVersion: ${apiVersion || 'default'}...`);
    const result = await model.generateContent("Halo, siapa kamu?");
    console.log(`✅ Success: ${result.response.text().substring(0, 100)}...`);
    return true;
  } catch (error) {
    console.error(`❌ Failed: ${error.message}`);
    return false;
  }
}

async function run() {
  console.log("=== Running Gemini Tests ===");
  await testModel("gemini-1.5-flash", "v1beta");
  await testModel("gemini-1.5-flash", "v1");
  await testModel("gemini-1.5-flash", null);
  await testModel("gemini-2.5-flash", "v1beta");
  await testModel("gemini-2.5-flash", "v1");
  await testModel("gemini-2.5-flash", null);
}

run();
