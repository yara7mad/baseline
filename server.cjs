const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const path = require('path');
const pdfParser = require('pdf-parse'); // Use a unique name
require('dotenv').config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/generate-review', upload.any(), async (req, res) => {
    console.log("🔥 ANALYZING REAL DATA...");
    try {
        let textForAI = "No text extracted.";
        
        if (req.files && req.files.length > 0) {
            try {
                // Using the specific function call that works across Node versions
                const data = await pdfParser(req.files[0].buffer);
                textForAI = data.text ? data.text.substring(0, 5000) : "Empty PDF";
                console.log("✅ PDF Text Captured!");
            } catch (err) {
                console.error("⚠️ PDF parsing issue, using filename as context:", err.message);
                textForAI = "Filename: " + req.files[0].originalname;
            }
        }

        const response = await axios.post(
            'https://api.groq.com/openai/v1/chat/completions',
            {
                model: "llama-3.3-70b-versatile",
                messages: [{ 
                    role: "user", 
                    content: `Act as a Senior PV Engineer. Analyze this: "${textForAI}". 
                    Return ONLY valid JSON. Extract REAL technical specs from the text.
                    {
                      "dashboard": {"dcKwp":"Extract","acKw":"Extract","inverterCount":"Extract","moduleCount":"Extract"},
                      "issues": [{"ID":"NCR-01","Category":"Technical","Severity":"Major","Description":"Detail","Action":"Verify"}],
                      "snapshot": [],
                      "promptLog": [{"timestamp": "${new Date().toISOString()}", "message": "Live Extraction"}]
                    }` 
                }],
                response_format: { type: "json_object" }
            },
            { headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` } }
        );

        res.json(JSON.parse(response.data.choices[0].message.content));

    } catch (error) {
        console.error("❌ BACKEND ERROR:", error.message);
        res.status(500).json({ error: error.message });
    }
});

app.listen(8080, () => console.log(`🚀 BASELINE LIVE: http://localhost:8080`));