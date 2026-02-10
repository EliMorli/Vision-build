import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {GoogleGenerativeAI} from "@google/generative-ai";

admin.initializeApp();

const db = admin.firestore();
const storage = admin.storage();

// ─── Configuration ─────────────────────────────────────────

const GEMINI_API_KEY = functions.config().gemini?.api_key ?? "";
const SENDGRID_API_KEY = functions.config().sendgrid?.api_key ?? "";

// ─── 1. analyzeRoom ────────────────────────────────────────
// Trigger: Called from the Flutter app after image upload.
// Action:  Sends image to Gemini 1.5 Flash for room analysis.
// Output:  Updates the project document with structured analysis.

export const analyzeRoom = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated."
    );
  }

  const {userId, projectId, imagePath} = data;

  if (!userId || !projectId || !imagePath) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Missing userId, projectId, or imagePath."
    );
  }

  // Download image from Firebase Storage
  const bucket = storage.bucket();
  const file = bucket.file(imagePath);
  const [imageBuffer] = await file.download();
  const base64Image = imageBuffer.toString("base64");

  // Call Gemini 1.5 Flash
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({model: "gemini-1.5-flash"});

  const prompt = `You are an expert interior designer and construction analyst. Analyze the
provided room photo and return ONLY a valid JSON object (no markdown, no
explanation) with this exact schema:

{
  "roomType": "kitchen|bathroom|bedroom|living_room|dining_room|office|other",
  "currentStyle": "a short style description",
  "estimatedSqFt": 150,
  "keyElements": ["oak cabinets", "tile flooring"],
  "rawAnalysis": "A 2-3 sentence human-readable summary."
}`;

  const result = await model.generateContent([
    prompt,
    {
      inlineData: {
        mimeType: "image/jpeg",
        data: base64Image,
      },
    },
  ]);

  const text = result.response.text();
  let analysis;
  try {
    const cleaned = text
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();
    analysis = JSON.parse(cleaned);
  } catch {
    analysis = {
      roomType: "other",
      currentStyle: "unknown",
      estimatedSqFt: 0,
      keyElements: [],
      rawAnalysis: text,
    };
  }

  // Update the project document
  await db
    .collection("users")
    .doc(userId)
    .collection("projects")
    .doc(projectId)
    .update({
      roomAnalysis: analysis,
      status: "analyzed",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

  return {success: true, analysis};
});

// ─── 2. generateDesign ─────────────────────────────────────
// Trigger: Called from the Flutter app when user clicks "Generate".
// Action:  Sends image + prompt to Imagen 3 (Vertex AI).
// Output:  Uploads generated images and updates the project.

export const generateDesign = functions
  .runWith({timeoutSeconds: 300, memory: "1GB"})
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated."
      );
    }

    const {userId, projectId, imagePath, stylePrompt, roomAnalysis} = data;

    if (!userId || !projectId || !imagePath || !stylePrompt) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing required parameters."
      );
    }

    // Download original image
    const bucket = storage.bucket();
    const file = bucket.file(imagePath);
    const [imageBuffer] = await file.download();
    const base64Image = imageBuffer.toString("base64");

    // Build the Imagen prompt
    const prompt = `Redesign this room with a ${stylePrompt}.
Current room analysis: ${roomAnalysis || "a residential room"}.
CRITICAL: PRESERVE the exact room layout (walls, windows, doors).
Only change surfaces, finishes, fixtures, furniture, and decor.
Professional interior design rendering, photorealistic, well-lit, 4K.`;

    // Call Vertex AI Imagen 3 via REST
    const projectIdGcp = functions.config().gcp?.project_id ?? "";
    const region = functions.config().gcp?.region ?? "us-central1";
    const {GoogleAuth} = require("google-auth-library");
    const auth = new GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });
    const client = await auth.getClient();
    const accessToken = (await client.getAccessToken()).token;

    const endpoint =
      `https://${region}-aiplatform.googleapis.com/v1/` +
      `projects/${projectIdGcp}/locations/${region}/` +
      `publishers/google/models/imagen-3.0-generate-002:predict`;

    const fetch = (await import("node-fetch")).default;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        instances: [{
          prompt: prompt,
          image: {bytesBase64Encoded: base64Image},
        }],
        parameters: {
          sampleCount: 4,
          aspectRatio: "1:1",
          safetyFilterLevel: "block_few",
          personGeneration: "dont_allow",
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new functions.https.HttpsError(
        "internal",
        `Imagen API error: ${errorText}`
      );
    }

    const result = await response.json() as any;
    const predictions = result.predictions || [];

    // Upload generated images to Storage
    const generatedUrls: string[] = [];
    for (let i = 0; i < predictions.length; i++) {
      const imgData = Buffer.from(
        predictions[i].bytesBase64Encoded,
        "base64"
      );
      const genPath =
        `users/${userId}/generations/${projectId}/gen_${i}.png`;
      const genFile = bucket.file(genPath);
      await genFile.save(imgData, {contentType: "image/png"});
      await genFile.makePublic();
      generatedUrls.push(genFile.publicUrl());
    }

    // Update project
    await db
      .collection("users")
      .doc(userId)
      .collection("projects")
      .doc(projectId)
      .update({
        generatedImageUrls: generatedUrls,
        status: "generated",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    return {success: true, generatedUrls};
  });

// ─── 3. dispatchLead ───────────────────────────────────────
// Trigger: Called when user clicks "Connect with Contractors".
// Action:  Uses Gemini Pro to write the comparison email, then
//          dispatches it via SendGrid to matched contractors.

export const dispatchLead = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated."
    );
  }

  const {
    userId,
    projectId,
    originalImagePath,
    generatedImagePath,
    zipCode,
    budgetRange,
    userName,
    roomType,
  } = data;

  if (!userId || !projectId || !zipCode || !budgetRange) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Missing required parameters."
    );
  }

  // Download both images
  const bucket = storage.bucket();
  const [origBuffer] = await bucket.file(originalImagePath).download();
  const [genBuffer] = await bucket.file(generatedImagePath).download();

  // Generate email with Gemini Pro
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({model: "gemini-1.5-pro"});

  const emailPrompt = `You are an expert construction project manager. Compare these two images:
Image A is the "Current State" and Image B is the "Goal State".

1. Identify the specific renovation tasks needed.
2. Do NOT suggest structural changes unless obvious.
3. Draft a professional contractor email.

Return ONLY valid JSON:
{
  "emailSubject": "New Lead: ${roomType} Remodel in ${zipCode} - Budget ${budgetRange}",
  "scopeOfWork": ["task1", "task2"],
  "projectType": "Type of renovation",
  "emailBody": "Full professional email body"
}

Client: ${userName}, Zip: ${zipCode}, Budget: ${budgetRange}, Room: ${roomType}`;

  const emailResult = await model.generateContent([
    emailPrompt,
    {inlineData: {mimeType: "image/jpeg", data: origBuffer.toString("base64")}},
    {inlineData: {mimeType: "image/png", data: genBuffer.toString("base64")}},
  ]);

  const emailText = emailResult.response.text();
  let emailData;
  try {
    const cleaned = emailText
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();
    emailData = JSON.parse(cleaned);
  } catch {
    emailData = {
      emailSubject: `New Renovation Lead in ${zipCode}`,
      scopeOfWork: [],
      projectType: "Renovation",
      emailBody: emailText,
    };
  }

  // Find contractors by zip code
  const contractorsSnap = await db
    .collection("contractors")
    .where("isActive", "==", true)
    .where("zipCode", "==", zipCode)
    .limit(5)
    .get();

  // Create lead documents and send emails
  const sgMail = require("@sendgrid/mail");
  sgMail.setApiKey(SENDGRID_API_KEY);

  const leads: string[] = [];

  for (const contractorDoc of contractorsSnap.docs) {
    const contractor = contractorDoc.data();
    const leadId = db.collection("_").doc().id; // auto-ID

    // Create lead document
    await db
      .collection("contractors")
      .doc(contractorDoc.id)
      .collection("leads")
      .doc(leadId)
      .set({
        projectId,
        userId,
        contractorId: contractorDoc.id,
        emailSubject: emailData.emailSubject,
        emailBody: emailData.emailBody,
        originalImageUrl: originalImagePath,
        generatedImageUrl: generatedImagePath,
        budgetRange,
        zipCode,
        scopeOfWork: emailData.scopeOfWork,
        status: "sent",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    // Send email via SendGrid
    if (SENDGRID_API_KEY && contractor.email) {
      try {
        await sgMail.send({
          to: contractor.email,
          from: "leads@visionbuild.app",
          subject: emailData.emailSubject,
          html: emailData.emailBody
            .replace(/\n/g, "<br>")
            .replace(
              /\[Contractor Name\]/g,
              contractor.contactName || contractor.businessName
            ),
        });
      } catch (emailError: any) {
        console.error(
          `Failed to send email to ${contractor.email}:`,
          emailError.message
        );
      }
    }

    leads.push(leadId);
  }

  // Update project status
  await db
    .collection("users")
    .doc(userId)
    .collection("projects")
    .doc(projectId)
    .update({
      status: "connected",
      "leadInfo.budgetRange": budgetRange,
      "leadInfo.zipCode": zipCode,
      "leadInfo.projectBrief": emailData.emailBody,
      "leadInfo.matchedContractorIds": contractorsSnap.docs.map(
        (d: any) => d.id
      ),
      "leadInfo.submittedAt": admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

  return {
    success: true,
    leadsCreated: leads.length,
    leadIds: leads,
  };
});
