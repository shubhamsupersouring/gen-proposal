require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { extractTextFromBuffer } = require('./utils/fileParser');
const { marked } = require('marked');
const HTMLtoDOCX = require('html-to-docx');

const app = express();
const port = process.env.PORT || 3000;

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Multer setup for memory storage (no uploads folder needed)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Express setup
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/', (req, res) => {
    res.render('index');
});

app.post('/generate', upload.single('prdFile'), async (req, res) => {
    try {
        const { notes } = req.body;
        const file = req.file;

        let extractedText = "";
        if (file) {
            extractedText = await extractTextFromBuffer(file.buffer, file.mimetype);
        }

        if (!extractedText && !notes) {
            return res.status(400).json({ error: "No PRD content or notes provided." });
        }

        const prompt = `You are a senior product and project consultant at EngineerBabu who writes elegant, structured, and highly detailed project proposals.
Given the PRD (Product Requirements Document) content and additional client needs below, produce the first 6 sections of a formal project proposal that exactly matches the structure and tone of the provided example.

PRD Content:
${extractedText}

Additional Client Needs:
${notes}

STRUCTURE TO FOLLOW EXACTLY (DO NOT generate sections 7 to 11, they will be appended automatically):

# Proposal: [Project Title]
**Project Specifications:**
**Client:** [Client Name or 'Valued Client']
**Date:** ${new Date().toLocaleDateString('en-GB')}
**Prepared By:** EngineerBabu Technologies Pvt. Ltd.

## 1. Product Vision & Objective
[Detailed articulation of the vision, problem statement, and high-level objectives in 2-3 paragraphs. Do not use asterisks or bold text unnecessarily.]

## 2. Scope of Work
[Break down into logical subsections like 2.1, 2.2, etc. based on the PRD. Include technical details, data flow, and core features using bullet points.]

### 2.1 [Subsection Name]
* [Bullet points...]

## 3. Deliverables
[List of specific project deliverables with bullet points.]

## 4. Technical Approach & Stack
[Technology decisions, frontend/backend/database choices based on the PRD.]

## 5. Project Management
### Team Structure
* Project Architect: Expertise in product architecture and implementation
* Project Manager: Ensures delivery within scope, timeline, and quality
* Business Analyst: Handles solutioning and documentation
* Engineers: Skilled in [relevant technologies based on PRD]
* QA Specialists: Ensure performance standards and quality compliance

### Change Management Process
* Submission: All change requests must be submitted in writing, detailing the requested change, rationale, and potential impact.
* Review: The project team will review the request to assess feasibility, impact on scope, budget, and timeline.
* Approval: Approved changes will require written agreement from both the client and the project manager.
* Implementation: Changes will be implemented as per the agreed-upon revised plan.
* Documentation: All changes and their impacts will be documented & communicated to relevant stakeholders.

### Risk & Assumptions
* [Bullet list of risks and what is assumed from the client based on PRD.]

[If the PRD involves third-party tools, APIs, or services, generate a cost comparison table EXACTLY in this markdown format. If not applicable, invent a generic technology cost table relevant to the PRD.]
| API / Provider | Cost (Start From) | [Relevant Feature 1] | [Relevant Feature 2] | [Relevant Feature 3] | [Relevant Feature 4] | Risk Level |
| --- | --- | --- | --- | --- | --- | --- |
| [Provider 1] | [Estimated Cost] | [Coverage] | [Coverage] | [Coverage] | [Coverage] | [Low/Medium/High] |
| [Provider 2] | [Estimated Cost] | [Coverage] | [Coverage] | [Coverage] | [Coverage] | [Low/Medium/High] |

**MVP RECOMMENDATION**
[Provide a 1-2 paragraph recommendation on which APIs/Tools to choose for the MVP, similar to the example.]

**Additional Assumption:**
[Generate a detailed assumptions table EXACTLY in this markdown format:]
| ID | Title | Description |
| --- | --- | --- |
| A1 | [Assumption Title] | [Detailed assumption description based on the PRD] |
| A2 | [Assumption Title] | [Detailed assumption description based on the PRD] |
| A3 | [Assumption Title] | [Detailed assumption description based on the PRD] |
| A4 | [Assumption Title] | [Detailed assumption description based on the PRD] |
| A5 | [Assumption Title] | [Detailed assumption description based on the PRD] |

## 6. Out of Scope
* [Explicit bullet list of what is NOT included in the PRD.]

---
TONE & STYLE:
- Extremely professional, authoritative, and consultative.
- Use exact headings and numbering as shown above.
- Use bullet points (*) for lists exactly like the example.
- Respond ONLY with the markdown content for sections 1 to 6.`;

        let result;
        let lastError;
        const modelsToTry = ["gemini-2.5-flash", "gemini-flash-latest", "gemini-2.5-pro"];
        
        for (const modelName of modelsToTry) {
            try {
                console.log(`Trying model: ${modelName}...`);
                const model = genAI.getGenerativeModel({ model: modelName }, { apiVersion: 'v1beta' });
                result = await model.generateContent(prompt);
                break; // If successful, exit the loop
            } catch (error) {
                console.warn(`Model ${modelName} failed:`, error.message);
                lastError = error;
                // If it's a 503 (temporary overload), we might want to wait a bit before trying the next
                if (error.status === 503 || error.message.includes('503')) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
        }

        if (!result) {
            throw lastError || new Error("All model fallbacks failed.");
        }
        
        const response = await result.response;
        let text = response.text();

        const staticContent = `
## 7. Key Decision Making Points

How to select best company
* Experience & expertise: Evaluate the company’s experience and domain expertise
* Project outcome: Speak with past customers to understand real project outcomes
* Reviews & case studies: Check genuine client reviews, testimonials, and case studies
* Project management process: Understand their project management and reporting process
* Support: Assess their support structure and post-delivery services
* Reachability: Ensure easy reachability, clear communication, and transparency
* Mindset: Look for passion, commitment, problem-solving mindset, and long-term partnership approach

How to select best technology
* Right fit: Ensure the technology proposed is the right fit for your specific business use case
* Goal Mapping: The chosen platform should align with both current goals and long-term growth plans
* Future ready: Focus on scalability, stability, and future readiness from the start
* Latest Tech: Be cautious of vendors who recommend outdated technology only to lower project costs. Cheaper technology choices often result in higher maintenance and performance costs later
* Stable Launch: Weak technology decisions can lead to functional limitations after launch
* Performance: Always prioritize long-term performance and sustainability over short-term savings

What can go wrong when you choose wrong team, technology
* Poor performance: The system may suffer from poor performance and frequent crashes.
* Scalability issue: Limited scalability can cause failures as the number of users grows.
* Security issue: Security gaps may lead to data breaches and compliance risks.
* Rework: Inefficient/incorrect code can result in high maintenance and recurring rework costs.
* Delays: Project timelines may get delayed due to repeated revisions and mismanagement.
* Brand issue: Customer trust and brand reputation can be severely impacted.
* No delivery: The investment may be wasted due to partial, unstable, or failed delivery.
* Downtime: Business operations may face downtime, leading to financial and operational losses.

Why different companies charge different pricing
* Experience & Expertise: Senior teams with proven expertise, certifications, and domain knowledge charge more than beginners.
* Team Strength & Skill Level: A company with strong architects, designers, QA, and project managers will naturally cost more than a basic dev-only team.
* Quality of Work: High-quality code, clean UI/UX, proper testing, and documentation increase cost but reduce long-term risks.
* Process & Methodology: Companies following structured processes (Agile, security audits, compliance, SOPs) invest more time and resources.
* Technology Stack Used: Modern, scalable, and secure technologies cost more than outdated or shortcut-based solutions.
* Project Management & Communication: Dedicated team, project managers, regular reporting, and client communication add value and cost.
* Company Location & Operational Costs: Office rent, salaries, taxes, and infrastructure differ by city and country.
* Support & Maintenance Commitment: Post-launch support, warranties, SLAs, and long-term maintenance affect pricing.
* Risk Ownership & Accountability: Companies that take full delivery responsibility and guarantee outcomes charge more than those who just code.
* Brand Value & Market Reputation: Well-established brands charge premium for trust, stability, and reliability.
* Hidden vs Transparent Pricing: Lower quotes often exclude testing, security, support, and rework, those costs appear later.

Important Note:
Some companies sell cheap development. Others sell reliability, scalability, and peace of mind.

## 9. Why you should choose EngineeBabu

* CMMI Level 5 Certified Group Company: We follow globally recognized, proven delivery methodologies that minimize risks and maximize business value.
* Proven Impact Through Automation & AI: In a recent engagement with a leading organization, our solution reduced repetitive tasks by 40% and improved overall operational efficiency by 25%.
* Premium Quality with Cost Effectiveness: Based in a Tier-2 city, we deliver top-tier quality at significantly optimized costs without compromising on excellence.
* End-to-End Technology Expertise: We specialize in Custom Mobile App & Website Design, AI-Integrated and AI-Powered Solutions, Cross-Platform Applications, Enterprise Solutions, SaaS Development, DevOps, and End-to-End Software Development.
    * Some Case Studies
        * Bank Open – $180M funded Neo Bank
        * Supersourcing AI Recruiter – AI changing hiring forever
        * Burq – Harvard-funded AI logistics company
        * Framebazaar – Turning traditional framing into digital
        * Google’s AI Hackathon – AI-based assessment for coder
        * Airbox – A platform for global selling
* Strong Focus on Scalable, Tailored Delivery: Every solution is built to be secure, scalable, and aligned with long-term business growth, delivered within committed timelines.
* Proven Track Record with High-Growth Startups & Enterprises: Supported 132 Y Combinator startups and 24 unicorns across diverse industries.
* Trusted by Global Industry Leaders: Chosen by brands such as Adani, Paytm, Apollo Hospitals, and Samsung.
* Client Satisfaction & Measurable Results: Client testimonials consistently highlight our ability to exceed expectations and deliver tangible, measurable outcomes.
    * Some testimonial:
        * https://youtu.be/e28VHdP5LeA?si=e-0zERfoWClo7wi9
        * https://youtu.be/d3s2fxs8Vug?si=lErL7qEZz-p5ZCv7
        * https://youtu.be/6rV_t7pR_EA?si=ZoKqyzF2MySXp_OY
        * https://youtu.be/bOtdHc7lap4?si=qXTB9nXWSbtxfwYl
        * https://youtu.be/m2AlVRbq92k?si=ZQJAJy9gc-pfwyGR
* Transparent Execution & High Accountability: Dedicated project managers, structured reporting, and complete delivery ownership.

## 10. Ownership & Rights

That covers:
* 100% ownership of the code, designs, and all IP will belong to the client.
* Source code, credentials, and access will be handed over post final payment.
* EngineerBabu will retain no commercial rights or reuse rights over this product
* EngineerBabu may reuse its tools, frameworks, and technical know-how.
* EngineerBabu may use the project for portfolio and marketing purposes.

## 11. Post Deployment Support

Free support period after go-live
* Duration: 2 Months
* That Covers:
    * Bug fixes for reported functional issues
    * Deployment assistance on live environment
    * Response time commitment (e.g., within 1 business day)
    * Basic training for internal teams (usage flows)

Note:
Any item, feature, or requirement not specified in the above scope shall be treated as out of scope. Any additional requests will be subject to a separate analysis, timeline, and commercial estimation.`;

        // Append static sections exactly as they are
        text = text.trim() + "\\n" + staticContent;

        res.json({ proposal: text });

    } catch (error) {
        console.error("Error generating proposal:", error);
        res.status(500).json({ error: "Internal Server Error. Please ensure your Gemini API key is correct." });
    }
});

app.post('/download-docx', async (req, res) => {
    try {
        const { markdown } = req.body;
        // Force newlines for the top specifications section so they don't merge into one line
        let processedMarkdown = markdown
            .replace(/\*\*Client:\*\*/g, '\n\n**Client:**')
            .replace(/\*\*Date:\*\*/g, '\n\n**Date:**')
            .replace(/\*\*Prepared By:\*\*/g, '\n\n**Prepared By:**')
            .replace(/\*\*Project Specifications:\*\*/g, '\n\n**Project Specifications:**');

        let html = await marked.parse(processedMarkdown, { breaks: true });

        // Apply inline styles to guarantee table formatting in DOCX
        html = html.replace(/<table>/g, '<table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; border: 1px solid black;">');
        html = html.replace(/<th>/g, '<th style="background-color: #f2f2f2; font-weight: bold; padding: 10px; border: 1px solid black; text-align: left;">');
        html = html.replace(/<td>/g, '<td style="padding: 10px; border: 1px solid black; text-align: left; vertical-align: top;">');

        // Wrap HTML in a basic template for DOCX conversion with styles to ensure tables have borders
        const fullHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {
                    font-family: Arial, sans-serif;
                    font-size: 11pt;
                    line-height: 1.5;
                    color: #000000;
                }
                h1, h2, h3, h4 {
                    color: #000000;
                    margin-top: 12pt;
                    margin-bottom: 6pt;
                }
                ul, ol {
                    margin-top: 0;
                    margin-bottom: 12pt;
                }
                li {
                    margin-bottom: 4pt;
                }
            </style>
        </head>
        <body>
            ${html}
        </body>
        </html>`;

        const docxBuffer = await HTMLtoDOCX(fullHtml, null, {
            table: { row: { cantSplit: true } },
            footer: true,
            pageNumber: true,
            font: 'Arial'
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', 'attachment; filename=proposal.docx');
        res.send(docxBuffer);

    } catch (error) {
        console.error("Error generating DOCX:", error);
        res.status(500).send("Error generating Word document.");
    }
});

const server = app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

server.on('error', (err) => {
    console.error('Server error:', err);
});
 