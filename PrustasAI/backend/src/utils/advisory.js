/**
 * Environmental advisory reference database
 * Provides fruit care guidance based on environmental conditions
 * Bilingual: English (en) and Filipino (fil)
 */
const advisoryDatabase = {
  mango: {
    general: {
      en: "Mango trees thrive in tropical climates (24-30°C). Need a distinct dry period for flowering. Avoid excessive nitrogen during fruiting.",
      fil: "Ang mga puno ng mangga ay umuunlad sa tropikal na klima (24-30°C). Kailangan ng tuyong panahon para sa pamumulaklak. Iwasan ang labis na nitrogen sa pagbubunga."
    },
    rainy_season: {
      en: "High risk of anthracnose and scab during wet weather. Apply preventive fungicide sprays from flowering through fruit development. Ensure high air circulation.",
      fil: "Mataas ang panganib ng anthracnose at scab sa basang panahon. Mag-spray ng preventive fungicide mula sa pamumulaklak hanggang sa paglaki ng prutas."
    },
    dry_season: {
      en: "Ideal flowering period. Apply potassium-rich fertilizer. Monitor closely for powdery mildew on flowers and young fruits.",
      fil: "Ideal na panahon ng pamumulaklak. Maglagay ng pataba na mayaman sa potassium. Bantayan ang powdery mildew sa mga bulaklak at batang prutas."
    },
    hot_season: {
      en: "Ensure adequate irrigation during fruit development. Harvest fruits at proper maturity to reduce postharvest diseases.",
      fil: "Tiyaking sapat ang irigasyon sa panahon ng paglaki ng prutas. Mag-ani ng prutas sa tamang gulang para mabawasan ang mga sakit pagkatapos mag-ani."
    }
  },
  banana: {
    general: {
      en: "Bananas thrive in warm, humid tropical regions (26-30°C) with consistent moisture. Avoid excessive water pooling.",
      fil: "Ang saging ay lumalago sa mainit at mahalumigmig na tropikal na rehiyon (26-30°C) na may palagiang kahalumigmigan. Iwasan ang pag-imbot ng tubig."
    },
    rainy_season: {
      en: "High risk of Panama disease and Sigatoka leaf spot. Prune lower dead leaves to reduce humidity and maintain clear drainage ditches.",
      fil: "Mataas ang panganib ng Panama disease at Sigatoka leaf spot. Putulin ang mga tuyong dahon sa ibaba at panatilihing malinis ang mga kanal."
    },
    dry_season: {
      en: "Irrigate deeply to sustain fruit weight. Use mulch (banana pseudostem pieces) to preserve moisture around the plant base.",
      fil: "Magdilig nang malalim upang mapanatili ang timbang ng saging. Gumamit ng mulch para mapanatili ang basa sa paligid ng puno."
    },
    hot_season: {
      en: "Provide windbreaks if possible. Inspect bunches for sunscald and cover with protective bags during peak heat.",
      fil: "Maglagay ng panangga sa hangin. Suriin ang mga piling kung may sunscald at balutin ng protective bags sa matinding init."
    }
  },
  papaya: {
    general: {
      en: "Papaya needs warm climates, full sun, and highly porous, well-draining soil. Standing water can cause root rot within 24 hours.",
      fil: "Ang papaya ay nangangailangan ng mainit na klima, sapat na sikat ng araw, at buhaghag at maayos na drainage ng lupa upang maiwasan ang pagkabulok."
    },
    rainy_season: {
      en: "Fungal diseases like anthracnose and phytophthora root rot peak. Minimize weeding around the base to avoid damaging sensitive root structures.",
      fil: "Lumalaganap ang anthracnose at phytophthora root rot. Iwasan ang pagbubunot ng damo malapit sa puno upang hindi mapinsala ang mga ugat."
    },
    dry_season: {
      en: "Water regularly, particularly during flowering and fruit set. Apply organic fertilizers to encourage sweet, uniform fruit growth.",
      fil: "Magdilig nang regular, lalo na kapag namumulaklak at nagbubunga. Maglagay ng organikong pataba para sa matamis at pantay na bunga."
    },
    hot_season: {
      en: "Watch for spider mites and whitefly outbreaks. Mulch generously around the base to maintain cooler soil temperatures.",
      fil: "Bantayan ang pagdami ng spider mites at whiteflies. Maglagay ng makapal na mulch sa puno upang manatiling malamig ang lupa."
    }
  },
  capsicum: {
    general: {
      en: "Capsicum (bell pepper) prefers warm days (21-27°C) and cooler nights. Highly sensitive to severe temperature drops or spikes.",
      fil: "Gusto ng capsicum (sili) ang mainit na araw (21-27°C) at mas malamig na gabi. Sensitibo sa biglaang pagbabago ng temperatura."
    },
    rainy_season: {
      en: "Prone to bacterial leaf spot and damping-off. Use raised planting beds to protect root health. Minimize foliage contact with wet soil.",
      fil: "Madaling kapitan ng bacterial leaf spot at damping-off. Gumamit ng raised beds at iwasang dumikit ang dahon sa basang lupa."
    },
    dry_season: {
      en: "Drip irrigation is highly recommended. Maintain calcium levels in the soil to prevent blossom end rot.",
      fil: "Inirerekomenda ang drip irrigation. Panatilihin ang sapat na calcium sa lupa upang maiwasan ang pagkabulok ng dulo ng bunga."
    },
    hot_season: {
      en: "Use shade nets to shield plants from scorching afternoon sun, which can cause fruit sunscald and flower drop.",
      fil: "Gumamit ng shade net upang protektahan ang halaman sa matinding araw sa hapon na sanhi ng sunscald at pagkalagas ng bulaklak."
    }
  },
  orange: {
    general: {
      en: "Oranges grow best in subtropical to tropical climates with deep, fertile soil. Require well-balanced fertilizing cycles.",
      fil: "Ang kahel ay pinakamahusay na lumalaki sa subtropical hanggang tropikal na klima na may malalim at matabang lupa. Kailangan ng balanseng pataba."
    },
    rainy_season: {
      en: "High humidity triggers citrus canker and root rot. Prune low-hanging branches to keep foliage at least 1.5 feet off the ground.",
      fil: "Ang mataas na humidity ay sanhi ng citrus canker at root rot. Putulin ang mabababang sanga upang lumayo ang dahon sa lupa."
    },
    dry_season: {
      en: "Ensure uniform, deep irrigation. Water stress during dry spells can lead to sudden fruit splitting and premature drop.",
      fil: "Tiyaking pantay at malalim ang irigasyon. Ang kakulangan sa tubig ay maaaring magdulot ng pagkabiyak ng bunga at pagkalagas nito."
    },
    hot_season: {
      en: "Monitor carefully for leaf miners and citrus psyllids. Keep trees well-watered to withstand scorching dry winds.",
      fil: "Bantayan ang mga leaf miner at citrus psyllid. Panatilihing may sapat na tubig ang puno laban sa mainit at tuyong hangin."
    }
  }
};

/**
 * Get advisory for a fruit type and optional season
 */
function getAdvisory(fruitType, season = 'general', language = 'en') {
  const fruitAdvisory = advisoryDatabase[fruitType];
  if (!fruitAdvisory) return null;

  const seasonAdvisory = fruitAdvisory[season] || fruitAdvisory['general'];
  return seasonAdvisory[language] || seasonAdvisory['en'];
}

/**
 * Get all advisories for a fruit
 */
function getAllAdvisories(fruitType, language = 'en') {
  const fruitAdvisory = advisoryDatabase[fruitType];
  if (!fruitAdvisory) return null;

  const result = {};
  for (const [season, texts] of Object.entries(fruitAdvisory)) {
    result[season] = texts[language] || texts['en'];
  }
  return result;
}

module.exports = { advisoryDatabase, getAdvisory, getAllAdvisories };
