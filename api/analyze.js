// api/analyze.js — Proxy Vercel vers l'API Anthropic
export default async function handler(req, res) {

  // Gestion du preflight CORS (requête OPTIONS du navigateur)
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  // Sécurité : uniquement les requêtes POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const { imageBase64, style, preferences } = req.body;

    if (!imageBase64 || !style) {
      return res.status(400).json({ error: 'imageBase64 et style sont requis' });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY, // Clé stockée dans Vercel, jamais exposée
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system: `Tu es StyleVision, un visagiste expert et coloriste de haut niveau. Tu analyses la morphologie du visage d'un client et tu proposes des recommandations coiffure personnalisées, précises et encourageantes.

Tu dois répondre UNIQUEMENT en JSON valide, sans backticks ni preamble, avec cette structure exacte :
{
  "titre": "Titre poétique de 4-6 mots pour ce profil",
  "analyse": "2-3 phrases d'analyse du visage (forme, traits, potentiel) en langage pro mais accessible",
  "recommendation": "2-3 phrases de recommandation coiffure personnalisée selon le style choisi et les préférences",
  "recs": [
    {"titre": "Coupe idéale", "contenu": "..."},
    {"titre": "Couleur recommandée", "contenu": "..."},
    {"titre": "Entretien", "contenu": "..."},
    {"titre": "Tendance à explorer", "contenu": "..."}
  ],
  "looks_recommandes": ["nom_look1", "nom_look2", "nom_look3"]
}

Les looks disponibles sont : Pixie Cut, Bob Carré, Lob Ondulé, Shag Layers, Boucles naturelles, Chignon haut, Balayage doré, Undercut féminin.`,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: `Style souhaité : ${style}\nPréférences : ${preferences || 'non précisées'}\n\nAnalyse le visage sur cette photo et donne tes recommandations coiffure personnalisées.`,
            },
          ],
        }],
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      return res.status(response.status).json({ error: err });
    }

    const data = await response.json();

    // Headers CORS pour autoriser l'appel depuis GitHub Pages
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    return res.status(200).json(data);

  } catch (error) {
    console.error('Erreur proxy:', error);
    return res.status(500).json({ error: 'Erreur serveur interne', detail: error.message });
  }
}
