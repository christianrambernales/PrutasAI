/**
 * Agriculturist-validated remedy database
 * Structure: fruit × disease × severity → treatment, timing, dosage, prevention
 * Bilingual: English (en) and Filipino (fil)
 */
const remedyDatabase = {
  mango: {
    anthracnose: {
      early: {
        treatment: { en: "Spray Mancozeb or Copper oxychloride on flowers and young fruits.", fil: "Mag-spray ng Mancozeb o Copper oxychloride sa mga bulaklak at batang prutas." },
        timing: { en: "Begin at flowering. Repeat every 10-14 days.", fil: "Magsimula sa pamumulaklak. Ulitin tuwing 10-14 na araw." },
        dosage: { en: "2.5g Mancozeb per liter of water.", fil: "2.5g Mancozeb bawat litro ng tubig." },
        prevention: { en: "Prune trees to improve air circulation. Remove mummified fruits.", fil: "Putulin ang mga puno para mapabuti ang daloy ng hangin. Alisin ang mga namamatay na prutas." }
      },
      moderate: {
        treatment: { en: "Alternate Mancozeb with Carbendazim or Thiophanate-methyl.", fil: "Palitan ang Mancozeb at Carbendazim o Thiophanate-methyl." },
        timing: { en: "Spray every 7 days during wet weather.", fil: "Mag-spray tuwing 7 araw sa basang panahon." },
        dosage: { en: "1g Carbendazim per liter of water.", fil: "1g Carbendazim bawat litro ng tubig." },
        prevention: { en: "Hot water treatment of harvested fruits (52°C for 10 minutes).", fil: "Hot water treatment ng mga naaning prutas (52°C sa loob ng 10 minuto)." }
      },
      severe: {
        treatment: { en: "Remove and destroy all infected fruits and branches. Heavy fungicide program.", fil: "Alisin at sirain ang lahat ng infected na prutas at sanga. Malakas na fungicide program." },
        timing: { en: "Continuous treatment every 5-7 days.", fil: "Tuloy-tuloy na paggamot tuwing 5-7 araw." },
        dosage: { en: "Maximum label rate of systemic fungicide.", fil: "Pinakamataas na dami ayon sa label ng systemic fungicide." },
        prevention: { en: "Postharvest hot water treatment. Cold storage at 10-13°C.", fil: "Postharvest hot water treatment. Cold storage sa 10-13°C." }
      }
    },
    powdery_mildew: {
      early: {
        treatment: { en: "Spray wettable sulfur on affected parts.", fil: "Mag-spray ng wettable sulfur sa mga apektadong bahagi." },
        timing: { en: "Apply at first sign of white powdery growth. Repeat every 10 days.", fil: "Ilagay sa unang palatandaan ng puting pulbos na paglaki. Ulitin tuwing 10 araw." },
        dosage: { en: "3g wettable sulfur per liter of water.", fil: "3g wettable sulfur bawat litro ng tubig." },
        prevention: { en: "Avoid excessive nitrogen fertilization. Ensure good air flow.", fil: "Iwasan ang labis na nitrogen fertilization. Tiyaking maayos ang daloy ng hangin." }
      },
      moderate: {
        treatment: { en: "Apply Hexaconazole or Dinocap fungicide.", fil: "Maglagay ng Hexaconazole o Dinocap fungicide." },
        timing: { en: "Spray every 7 days until flowering ends.", fil: "Mag-spray tuwing 7 araw hanggang matapos ang pamumulaklak." },
        dosage: { en: "2ml Hexaconazole per liter.", fil: "2ml Hexaconazole bawat litro." },
        prevention: { en: "Balanced fertilization. Remove infected panicles.", fil: "Balanseng fertilization. Alisin ang mga infected na panicles." }
      },
      severe: {
        treatment: { en: "Combination spray of sulfur + systemic fungicide. Remove all heavily infected panicles.", fil: "Combination spray ng sulfur + systemic fungicide. Alisin ang lahat ng malalang infected na panicles." },
        timing: { en: "Spray every 5 days.", fil: "Mag-spray tuwing 5 araw." },
        dosage: { en: "Per label instructions for combination application.", fil: "Ayon sa label instructions para sa combination application." },
        prevention: { en: "Pre-bloom preventive sprays in subsequent seasons.", fil: "Pre-bloom preventive sprays sa mga susunod na season." }
      }
    }
  },
  banana: {
    anthracnose: {
      early: {
        treatment: { en: "Remove infected leaves. Spray copper hydroxide.", fil: "Alisin ang mga apektadong dahon. Mag-spray ng copper hydroxide." },
        timing: { en: "Apply at first sign of symptoms. Repeat every 14 days.", fil: "Ilagay sa unang palatandaan ng sintomas. Ulitin tuwing 14 na araw." },
        dosage: { en: "2g copper hydroxide per liter of water.", fil: "2g bawat litro ng tubig ng copper hydroxide." },
        prevention: { en: "De-leaf lower dry leaves regularly. Maintain clear drainage.", fil: "Regular na alisin ang mababang dahon. Panatilihing maayos ang drainage." }
      },
      moderate: {
        treatment: { en: "Apply systemic fungicide (e.g. Difenoconazole). Protect developing bunches.", fil: "Gumamit ng systemic fungicide (tulad ng Difenoconazole). Protektahan ang mga piling." },
        timing: { en: "Apply every 10-12 days during humid conditions.", fil: "Ilagay tuwing 10-12 araw sa mahalumigmig na panahon." },
        dosage: { en: "1.5ml Difenoconazole per liter.", fil: "1.5ml Difenoconazole bawat litro." },
        prevention: { en: "Bag young banana bunches with transparent polythene bags.", fil: "Balutin ng transparent na plastic bag ang mga piling ng saging habang bata." }
      },
      severe: {
        treatment: { en: "Cut and destroy severely affected trees. Spray systemic protectant mix on surrounding trees.", fil: "Putulin at sirain ang mga malalang apektadong puno. Mag-spray sa mga karatig na puno." },
        timing: { en: "Immediate action required. Repeat sprays every 7 days.", fil: "Kailangan ng mabilis na aksyon. Ulitin ang spray tuwing 7 araw." },
        dosage: { en: "2ml systemic fungicide per liter of water.", fil: "2ml systemic fungicide bawat litro ng tubig." },
        prevention: { en: "Avoid replanting in contaminated areas. Ensure strict tool sanitation.", fil: "Iwasan ang muling pagtatanim sa apektadong lugar. Tiyaking malinis ang mga kagamitan." }
      }
    },
    sigatoka: {
      early: {
        treatment: { en: "Remove leaves with early yellow streaks. Spray chlorothalonil.", fil: "Alisin ang mga dahong may dilaw na guhit. Mag-spray ng chlorothalonil." },
        timing: { en: "Spray at start of rainy season, repeat every 14-21 days.", fil: "Mag-spray sa simula ng tag-ulan, ulitin tuwing 14-21 araw." },
        dosage: { en: "2.5g chlorothalonil per liter of water.", fil: "2.5g chlorothalonil bawat litro ng tubig." },
        prevention: { en: "Proper plant spacing to encourage rapid leaf drying.", fil: "Tamang agwat ng mga puno upang mabilis matuyo ang mga dahon." }
      },
      moderate: {
        treatment: { en: "Alternate chlorothalonil with systemic Propiconazole.", fil: "Palitan ang chlorothalonil ng systemic na Propiconazole." },
        timing: { en: "Apply every 10-14 days.", fil: "Ilagay tuwing 10-14 araw." },
        dosage: { en: "1ml Propiconazole per liter of water.", fil: "1ml Propiconazole bawat litro ng tubig." },
        prevention: { en: "Apply mineral oils to suppress fungal spore germination.", fil: "Maglagay ng mineral oil upang mapigilan ang pagtubo ng fungal spores." }
      },
      severe: {
        treatment: { en: "Aggressive canopy pruning. Spray systemic triazole cocktail.", fil: "Matinding pruning ng mga dahon. Mag-spray ng triazole cocktail." },
        timing: { en: "Apply every 7-10 days until disease is suppressed.", fil: "Ilagay tuwing 7-10 araw hanggang mapigilan ang sakit." },
        dosage: { en: "Max label dose of systemic triazole.", fil: "Pinakamataas na dami ayon sa label ng systemic triazole." },
        prevention: { en: "Implement field-wide crop hygiene and improve total soil aeration.", fil: "Magsagawa ng malawakang kalinisan sa taniman at pagbutihin ang hangin sa lupa." }
      }
    }
  },
  papaya: {
    anthracnose: {
      early: {
        treatment: { en: "Spray protective Copper oxychloride. Remove damaged fruit buds.", fil: "Mag-spray ng protective Copper oxychloride. Alisin ang mga sirang bulaklak." },
        timing: { en: "Apply every 10-14 days during warm, wet spells.", fil: "Ilagay tuwing 10-14 araw sa mainit at basang panahon." },
        dosage: { en: "2.5g Copper oxychloride per liter.", fil: "2.5g Copper oxychloride bawat litro." },
        prevention: { en: "Ensure maximum sunlight exposure. Prune surrounding weeds.", fil: "Tiyaking sapat ang sikat ng araw. Putulin ang mga damo sa paligid." }
      },
      moderate: {
        treatment: { en: "Apply Dithiocarbamate fungicide or Prochloraz.", fil: "Maglagay ng Dithiocarbamate fungicide o Prochloraz." },
        timing: { en: "Spray every 7-10 days.", fil: "Mag-spray tuwing 7-10 araw." },
        dosage: { en: "2ml Prochloraz per liter of water.", fil: "2ml Prochloraz bawat litro ng tubig." },
        prevention: { en: "Practice careful handling during fruit thinning to avoid scratching skin.", fil: "Mag-ingat sa pagpili at pag-aayos ng prutas upang maiwasan ang sugat sa balat." }
      },
      severe: {
        treatment: { en: "Discard all heavily spotted fruits. Spray systemic Azoxystrobin.", fil: "Itapon ang lahat ng may matinding batik na prutas. Mag-spray ng Azoxystrobin." },
        timing: { en: "Apply immediately. Repeat in 7 days.", fil: "Maglagay agad. Ulitin pagkaraan ng 7 araw." },
        dosage: { en: "1g Azoxystrobin bawat litro ng tubig.", fil: "1g Azoxystrobin bawat litro ng tubig." },
        prevention: { en: "Adopt postharvest hot water treatment (48°C for 20 minutes).", fil: "Magsagawa ng postharvest hot water treatment (48°C sa loob ng 20 minuto)." }
      }
    },
    phytophthora: {
      early: {
        treatment: { en: "Improve drainage channel. Apply Metalaxyl to root zone.", fil: "Pagbutihin ang kanal ng drainage. Maglagay ng Metalaxyl sa may ugat." },
        timing: { en: "Apply immediately upon wet soil pooling.", fil: "Ilagay agad kapag may naipong tubig sa lupa." },
        dosage: { en: "2g Metalaxyl bawat litro ng tubig.", fil: "2g Metalaxyl bawat litro ng tubig." },
        prevention: { en: "Avoid planting in heavy clay soils or low-lying waterlogged spots.", fil: "Iwasang magtanim sa malagkit na lupa o sa mga mabababang lugar na binabaha." }
      },
      moderate: {
        treatment: { en: "Drench soil with Phosphorous acid or Mancozeb-Metalaxyl mix.", fil: "Diligin ang lupa ng Phosphorous acid o pinaghalong Mancozeb-Metalaxyl." },
        timing: { en: "Apply every 10 days for 3 cycles.", fil: "Ilagay tuwing 10 araw sa loob ng 3 cycle." },
        dosage: { en: "3g Metalaxyl-M bawat litro ng tubig.", fil: "3g Metalaxyl-M bawat litro ng tubig." },
        prevention: { en: "Mound plants on raised beds at least 30cm high.", fil: "Itaas ang mga puno sa kama ng lupa na may taas na 30cm." }
      },
      severe: {
        treatment: { en: "Uproot infected papaya plants. Apply lime to soil. Treat healthy adjacent plants.", fil: "Bunutin ang mga may sakit na papaya. Lagyan ng apog ang lupa. Gamutin ang mga katabing puno." },
        timing: { en: "Immediate destruction of infected plant tissue.", fil: "Mabilis na pagsira sa mga infected na bahagi ng halaman." },
        dosage: { en: "250g lime per planting hole; 3.5g fungicide for surrounding roots.", fil: "250g apog sa bawat hukay; 3.5g fungicide sa mga karatig na ugat." },
        prevention: { en: "Adopt 3-year crop rotation. Sterilize tools after contact with soil.", fil: "Mag-rotate ng pananim tuwing 3 taon. I-sterilize ang mga gamit matapos madikit sa lupa." }
      }
    }
  },
  capsicum: {
    anthracnose: {
      early: {
        treatment: { en: "Apply preventive Chlorothalonil or Mancozeb.", fil: "Maglagay ng preventive Chlorothalonil o Mancozeb." },
        timing: { en: "Apply at fruit set. Repeat every 10 days during rainy period.", fil: "Ilagay kapag nagsisimulang mamunga. Ulitin tuwing 10 araw sa tag-ulan." },
        dosage: { en: "2g chlorothalonil per liter.", fil: "2g chlorothalonil bawat litro." },
        prevention: { en: "Use clean seeds. Maintain a weed-free plant environment.", fil: "Gumamit ng malinis na buto. Panatilihing walang damo ang paligid." }
      },
      moderate: {
        treatment: { en: "Apply systemic Azoxystrobin or Pyraclostrobin.", fil: "Maglagay ng systemic na Azoxystrobin o Pyraclostrobin." },
        timing: { en: "Apply every 7 days.", fil: "Ilagay tuwing 7 araw." },
        dosage: { en: "1ml Pyraclostrobin per liter of water.", fil: "1ml Pyraclostrobin bawat litro ng tubig." },
        prevention: { en: "Mulch soil surface using plastic or straw to prevent splash dispersal.", fil: "Takpan ang lupa ng plastic o dayami upang maiwasan ang pagtalsik ng spores." }
      },
      severe: {
        treatment: { en: "Destroy all infected peppers and stems. Apply powerful systemic fungicide mix.", fil: "Sirain ang lahat ng infected na sili at tangkay. Maglagay ng malakas na systemic fungicide." },
        timing: { en: "Immediate sanitization and spray program every 5 days.", fil: "Mabilis na paglilinis at pag-spray tuwing 5 araw." },
        dosage: { en: "Maximum label dose of Azoxystrobin-Difenoconazole mix.", fil: "Pinakamataas na dami ng pinaghalong Azoxystrobin-Difenoconazole." },
        prevention: { en: "Avoid planting solanaceous crops in the same area for 2 years.", fil: "Iwasang magtanim ng mga halamang sili o kamatis sa parehong lugar sa loob ng 2 taon." }
      }
    },
    bacterial_spot: {
      early: {
        treatment: { en: "Spray Copper hydroxide combined with Mancozeb.", fil: "Mag-spray ng Copper hydroxide na may kasamang Mancozeb." },
        timing: { en: "Apply at first spot detection. Repeat every 7-10 days.", fil: "Ilagay sa unang batik. Ulitin tuwing 7-10 araw." },
        dosage: { en: "1.5g copper + 1.5g mancozeb per liter.", fil: "1.5g copper + 1.5g mancozeb bawat litro." },
        prevention: { en: "Avoid working in the field when plants are wet with dew or rain.", fil: "Iwasang magtrabaho sa taniman kapag basa ang dahon ng hamog o ulan." }
      },
      moderate: {
        treatment: { en: "Apply copper-fungicide mix. Remove heavily spotted foliage.", fil: "Mag-spray ng copper-fungicide mix. Alisin ang mga batik-batik na dahon." },
        timing: { en: "Spray every 7 days.", fil: "Mag-spray tuwing 7 araw." },
        dosage: { en: "2g copper hydroxide per liter.", fil: "2g copper hydroxide bawat litro." },
        prevention: { en: "Use drip irrigation instead of overhead sprinklers.", fil: "Gumamit ng drip irrigation sa halip na overhead sprinklers." }
      },
      severe: {
        treatment: { en: "Uproot infected capsicum plants. Apply protective copper sprays on surrounding area.", fil: "Bunutin ang mga apektadong sili. Mag-spray ng protective copper sa paligid." },
        timing: { en: "Destroy infected crop residue immediately.", fil: "Sirain agad ang mga natirang apektadong tanim." },
        dosage: { en: "3g copper hydroxide per liter of water.", fil: "3g copper hydroxide bawat litro ng tubig." },
        prevention: { en: "Use disease-resistant pepper varieties in the next cycle.", fil: "Gumamit ng mga barayti ng sili na lumalaban sa sakit sa susunod na taniman." }
      }
    }
  },
  orange: {
    citrus_canker: {
      early: {
        treatment: { en: "Apply protective copper-based sprays on leaves and developing fruits.", fil: "Maglagay ng protective copper-based spray sa mga dahon at batang bunga." },
        timing: { en: "Apply every 21 days during periods of wet, warm weather.", fil: "Ilagay tuwing 21 araw kapag basa at mainit ang panahon." },
        dosage: { en: "2g copper hydroxide per liter.", fil: "2g copper hydroxide bawat litro." },
        prevention: { en: "Control leaf miners, as their tunnels create entry points for bacteria.", fil: "Puksain ang mga leaf miner, dahil ang kanilang mga lagusan ay daanan ng bakterya." }
      },
      moderate: {
        treatment: { en: "Prune infected twigs during dry periods. Apply strong copper sprays.", fil: "Putulin ang mga apektadong sanga sa tag-tuyo. Mag-spray ng malakas na copper spray." },
        timing: { en: "Prune and treat immediately. Spray every 14 days.", fil: "Putulin at gamutin agad. Mag-spray tuwing 14 na araw." },
        dosage: { en: "2.5g copper hydroxide bawat litro ng tubig.", fil: "2.5g copper hydroxide bawat litro ng tubig." },
        prevention: { en: "Install windbreaks around citrus groves to reduce wind-driven rain damage.", fil: "Maglagay ng panangga sa hangin upang mabawasan ang pinsala mula sa malakas na ulan." }
      },
      severe: {
        treatment: { en: "Remove and burn severely infected trees. Establish strict sanitation protocols.", fil: "Alisin at sunugin ang mga malalang apektadong puno. Magsagawa ng mahigpit na kalinisan." },
        timing: { en: "Immediate eradication required. Quarantine the area.", fil: "Mabilis na pagpuksa ang kailangan. I-quarantine ang apektadong lugar." },
        dosage: { en: "Apply copper spray on surrounding trees at 3g per liter.", fil: "Mag-spray ng copper sa mga katabing puno sa dami na 3g bawat litro." },
        prevention: { en: "Sterilize pruning tools with 10% bleach solution between trees.", fil: "I-sterilize ang mga kagamitan gamit ang 10% bleach bago gamitin sa ibang puno." }
      }
    },
    scab: {
      early: {
        treatment: { en: "Apply preventive copper fungicide or Ferbam.", fil: "Maglagay ng preventive copper fungicide o Ferbam." },
        timing: { en: "Spray at first flush of new leaves, and again at petal fall.", fil: "Mag-spray sa unang pagsibol ng dahon, at muli kapag nalalagas ang petals." },
        dosage: { en: "2g copper oxychloride per liter.", fil: "2g copper oxychloride bawat litro." },
        prevention: { en: "Remove overhead canopy density to speed up foliage drying.", fil: "Bawasan ang kapal ng sanga sa itaas upang mabilis matuyo ang mga dahon." }
      },
      moderate: {
        treatment: { en: "Apply systemic Benomyl or Strobilurin fungicide.", fil: "Maglagay ng systemic na Benomyl o Strobilurin fungicide." },
        timing: { en: "Spray every 14 days during wet spring flush.", fil: "Mag-spray tuwing 14 na araw sa basang panahon." },
        dosage: { en: "1.5g Strobilurin bawat litro ng tubig.", fil: "1.5g Strobilurin bawat litro ng tubig." },
        prevention: { en: "Prune low-hanging branches to increase under-tree air flow.", fil: "Putulin ang mabababang sanga upang mapabuti ang daloy ng hangin sa ilalim." }
      },
      severe: {
        treatment: { en: "Prune all severely affected shoots. Apply aggressive systemic spray schedule.", fil: "Putulin ang lahat ng apektadong usbong. Magsagawa ng tuloy-tuloy na pag-spray." },
        timing: { en: "Apply every 7-10 days for 3-4 cycles.", fil: "Ilagay tuwing 7-10 araw sa loob ng 3-4 cycle." },
        dosage: { en: "Max label rate of Benomyl or copper mix.", fil: "Pinakamataas na dami ng Benomyl o pinaghalong copper ayon sa label." },
        prevention: { en: "Avoid over-irrigation during young leaf flushes.", fil: "Iwasan ang labis na pagdidilig kapag sumisibol ang mga bagong dahon." }
      }
    }
  }
};

/**
 * Look up remedy by fruit type, disease, and severity
 */
function getRemedy(fruitType, disease, severity, language = 'en') {
  const fruitData = remedyDatabase[fruitType];
  if (!fruitData) return null;

  const diseaseData = fruitData[disease];
  if (!diseaseData) return null;

  const severityData = diseaseData[severity];
  if (!severityData) return null;

  return {
    treatment: severityData.treatment[language] || severityData.treatment['en'],
    timing: severityData.timing[language] || severityData.timing['en'],
    dosage: severityData.dosage[language] || severityData.dosage['en'],
    prevention: severityData.prevention[language] || severityData.prevention['en']
  };
}

/**
 * Get all diseases for a fruit type
 */
function getDiseasesForFruit(fruitType) {
  const fruitData = remedyDatabase[fruitType];
  if (!fruitData) return [];
  return Object.keys(fruitData);
}

module.exports = { remedyDatabase, getRemedy, getDiseasesForFruit };
