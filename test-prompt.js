require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

async function test() {
    const extractedText = "This is a dummy PRD for a website.";
    const notes = "Client wants it in 3 months.";
    const prompt = `You are a senior product and project consultant at EngineerBabu who writes elegant, structured, and highly detailed project proposals.
Given the PRD (Product Requirements Document) content and additional client needs below, produce a formal project proposal that matches the following structure and tone exactly.

PRD Content:
${extractedText}

Additional Client Needs:
${notes}

STRUCTURE TO FOLLOW:

# Proposal: [Project Title]
**Project Specifications:**
**Client:** [Client Name or 'Valued Client']
**Date:** ${new Date().toLocaleDateString('en-GB')}
**Prepared By:** EngineerBabu Technologies Pvt. Ltd.

---

## 1. Product Vision & Objective
[Detailed articulation of the vision, problem statement, and high-level objectives in 2-3 paragraphs.]

## 2. Scope of Work
[Break down into logical subsections like 2.1, 2.2, etc. based on the PRD. Include technical details, data flow, and core features.]

### 2.1 [Subsection Name]
[Bullet points...]

## 3. Deliverables
[List of specific project deliverables.]

## 4. Technical Approach & Stack
[Technology decisions, frontend/backend/database choices.]

## 5. Project Management
### Team Structure
[Recommended team roles: Architect, PM, BA, Engineers, QA.]
### Change Management Process
[Description of how changes are handled.]
### Risk & Assumptions
[Bullet list of risks and what is assumed from the client.]

## 6. Out of Scope
[Explicit list of what is NOT included.]

## 7. Key Decision Making Points
[Guidance for the client on making technical or business decisions.]

## 8. Why you should choose EngineerBabu
[Branding section about CMMI Level 5, AI expertise, and case studies.]

## 9. Ownership & Rights
[100% ownership of code, IP, etc.]

## 10. Post Deployment Support
[Duration and what is covered (bug fixes, deployment assistance, etc.).]

---

TONE & STYLE:
- Extremely professional, authoritative, and consultative.
- Use structured numbering (1., 1.1, 2., etc.).
- Be specific about technical terms mentioned in the PRD.
- Use tables where appropriate for costs or comparisons (if data exists).
- If the PRD is brief, intelligently expand on the standard industry requirements for such a project to provide a "premium" feel.

Respond ONLY with the markdown content.`;

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }, { apiVersion: 'v1beta' });
        const result = await model.generateContent(prompt);
        console.log("Success! Output snippet:", result.response.text().substring(0, 100));
    } catch (e) {
        console.error("Error:", e);
    }
}

test();
