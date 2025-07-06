export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { imageData } = req.body;

        if (!imageData) {
            return res.status(400).json({ error: 'No image data provided' });
        }

        // Try multiple environment variable names
        const OPENAI_API_KEY = process.env.OPENAI_API_KEY || 
                               process.env.OPENAI_API_KEY_PROD || 
                               process.env.API_KEY_OPENAI;
        
        // Debug logging (remove in production)
        console.log('Environment check:', {
            hasApiKey: !!OPENAI_API_KEY,
            keyLength: OPENAI_API_KEY ? OPENAI_API_KEY.length : 0,
            keyPrefix: OPENAI_API_KEY ? OPENAI_API_KEY.substring(0, 7) + '...' : 'none',
            allEnvKeys: Object.keys(process.env).sort(),
            vercelKeys: Object.keys(process.env).filter(k => k.includes('VERCEL')),
            openaiKeys: Object.keys(process.env).filter(k => k.includes('OPENAI') || k.includes('API'))
        });
        
        if (!OPENAI_API_KEY) {
            return res.status(500).json({ 
                error: 'OpenAI API key not configured',
                debug: `Environment variables available: ${Object.keys(process.env).length}`,
                allKeys: Object.keys(process.env).sort()
            });
        }

        const prompt = `You are analyzing a class schedule or calendar image. Pay close attention to the visual formatting and layout:

FOR UCSB CLASS SCHEDULES:
- Course names/titles are usually in BOLD or larger text (e.g., "MATH 3B", "CHEM 1A", "ECON 10A")
- Verify course codes match UCSB format: SUBJECT + NUMBER (e.g., CS 16, PHYS 1, HIST 4B)
- Common UCSB subjects: MATH, CS, CHEM, PHYS, ECON, HIST, ENGL, PSTAT, MCDB, etc.
- Location/room information appears directly below course title
- UCSB locations include: Phelps Hall, Campbell Hall, Girvetz Hall, HSSB, Webb Hall, Broida Hall, etc.
- Time information appears below location
- Days shown as M, T, W, R, F (Mon, Tue, Wed, Thu, Fri)
- DO NOT confuse location names with course titles

FOR GENERAL EVENTS:
- Event titles may be in various formats
- Extract date, time, and location information

VALIDATION REQUIREMENTS:
- If claiming to be a UCSB course, verify the subject code exists at UCSB
- If claiming to be a UCSB location, verify it's a real campus building/room
- Mark uncertain extractions in the description field

Analyze this image and provide a JSON object with:
1. "isClassSchedule" (boolean) - true if this appears to be a class schedule with multiple recurring classes
2. "events" array with each event having:
   - "title" (the actual course name/event title, NOT the location)
   - "date" (YYYY-MM-DD format)
   - "startTime" (HH:MM, 24-hour format)
   - "endTime" (HH:MM, 24-hour format or null)
   - "location" (room/building name, NOT the course title)
   - "description" (additional details like section number, instructor, validation notes)
   - "recurring" (boolean - true for weekly classes, false for one-time events)
   - "endDate" (YYYY-MM-DD format for when recurring classes end, typically end of quarter)
   - "validated" (boolean - true if course/location appears to be valid UCSB data)

If no specific dates are given, use reasonable dates for the current quarter. If it's a weekly class schedule, create events for each day mentioned.

Look carefully at the visual hierarchy - course names are typically more prominent than locations and times.`;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-4o",
                messages: [
                    {
                        role: "user",
                        content: [
                            { type: "text", text: prompt },
                            {
                                type: "image_url",
                                image_url: {
                                    url: imageData
                                }
                            }
                        ]
                    }
                ],
                response_format: { type: "json_object" },
                max_tokens: 2000
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
        }

        const data = await response.json();
        const eventDetails = JSON.parse(data.choices[0].message.content);
        res.status(200).json(eventDetails);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to extract event details from image', details: error.message });
    }
} 