export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    
    res.status(200).json({
        hasApiKey: !!OPENAI_API_KEY,
        keyLength: OPENAI_API_KEY ? OPENAI_API_KEY.length : 0,
        keyPrefix: OPENAI_API_KEY ? OPENAI_API_KEY.substring(0, 10) + '...' : 'none',
        allEnvVars: Object.keys(process.env).length,
        envVarNames: Object.keys(process.env).filter(key => key.includes('OPENAI') || key.includes('API')),
        nodeEnv: process.env.NODE_ENV,
        vercelEnv: process.env.VERCEL_ENV
    });
} 