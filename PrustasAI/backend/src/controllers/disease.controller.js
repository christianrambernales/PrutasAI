const Disease = require('../models/Disease');

/**
 * Get all diseases, optionally filtered by fruit type
 * GET /api/diseases?fruitType=banana
 */
exports.getAllDiseases = async (req, res) => {
  try {
    const filter = {};
    if (req.query.fruitType) {
      filter.fruitType = req.query.fruitType;
    }

    const language = req.user?.preferredLanguage || 'en';
    const diseases = await Disease.find(filter).lean();

    // Map to localized response
    const localized = diseases.map(d => ({
      id: d._id,
      name: d.name,
      displayName: d.displayName[language] || d.displayName['en'],
      fruitType: d.fruitType,
      description: d.description[language] || d.description['en'],
      symptoms: d.symptoms[language] || d.symptoms['en'],
      causes: d.causes[language] || d.causes['en']
    }));

    res.json({ diseases: localized });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get supported fruits list
 * GET /api/diseases/fruits
 */
exports.getSupportedFruits = async (req, res) => {
  const fruits = [
    { id: 'mango', name: { en: 'Mango', fil: 'Mangga' }, emoji: '🥭' },
    { id: 'banana', name: { en: 'Banana', fil: 'Saging' }, emoji: '🍌' },
    { id: 'papaya', name: { en: 'Papaya', fil: 'Papaya' }, emoji: '🍈' },
    { id: 'capsicum', name: { en: 'Capsicum', fil: 'Capsicum' }, emoji: '🫑' },
    { id: 'orange', name: { en: 'Orange', fil: 'Kahel' }, emoji: '🍊' }
  ];

  const language = req.user?.preferredLanguage || 'en';
  const localized = fruits.map(f => ({
    id: f.id,
    name: f.name[language] || f.name['en'],
    emoji: f.emoji
  }));

  res.json({ fruits: localized });
};

/**
 * Get disease by ID
 * GET /api/diseases/:id
 */
exports.getDiseaseById = async (req, res) => {
  try {
    const disease = await Disease.findById(req.params.id).lean();
    if (!disease) {
      return res.status(404).json({ error: 'Disease not found.' });
    }

    const language = req.user?.preferredLanguage || 'en';

    res.json({
      disease: {
        id: disease._id,
        name: disease.name,
        displayName: disease.displayName[language] || disease.displayName['en'],
        fruitType: disease.fruitType,
        description: disease.description[language] || disease.description['en'],
        symptoms: disease.symptoms[language] || disease.symptoms['en'],
        causes: disease.causes[language] || disease.causes['en'],
        remedies: disease.remedies,
        referenceImages: disease.referenceImages
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
