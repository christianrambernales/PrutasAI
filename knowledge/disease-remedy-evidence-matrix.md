# PrutasAI Disease–Remedy Evidence Matrix

Status: draft-only. Production taxonomy, SQL, migrations, and application code were not modified.

Day 1, Day 5, and Day 10 are app observation checkpoints only. They are not pesticide reapplication intervals.

## Applicability matrix

| Fruit | Disease key | Plant part | Awareness only | Evidence status | Pesticide recommendation | Source IDs |
|---|---|---|---:|---|---|---|
| Papaya | anthracnose | leaf and fruit | no | supported | No verified recommendation found. | PH_UPLB_PAPAYA_ANTHRACNOSE, EXT_UF_PAPAYA_DISEASES |
| Papaya | powdery_mildew | leaf | no | partially_supported | No verified recommendation found. | PH_FPA_REGISTERED_PESTICIDES_2026_07, EXT_UF_PAPAYA_DISEASES |
| Papaya | rust | leaf | no | insufficient_evidence | No verified recommendation found. | none verified |
| Papaya | scab | fruit | no | insufficient_evidence | No verified recommendation found. | none verified |
| Papaya | blight | leaf | no | unresolved_term | No verified recommendation found. | PH_BPI_PAPAYA_GUIDE, EXT_UF_PAPAYA_DISEASES |
| Papaya | mold | fruit | yes | unresolved_term | No verified recommendation found. | none verified |
| Papaya | rot | fruit | yes | supported | No verified recommendation found. | PH_BPI_PAPAYA_GUIDE |
| Banana | anthracnose | leaf and fruit | no | supported | No verified recommendation found. | PH_PCAARRD_BANANA_HIYEAST, PH_FPA_REGISTERED_PESTICIDES_2026_07, EXT_UH_BANANA_ROTS_PD54 |
| Banana | rust | leaf | no | partially_supported | No verified recommendation found. | PH_FPA_REGISTERED_PESTICIDES_2026_07, EXT_UOG_BANANA_RUST |
| Banana | blight | leaf | no | unresolved_term | No verified recommendation found. | none verified |
| Banana | mold | fruit | yes | supported | No verified recommendation found. | PH_FPA_REGISTERED_PESTICIDES_2026_07 |
| Banana | rot | fruit | yes | supported | No verified recommendation found. | PH_PCAARRD_BANANA_HIYEAST, PH_FPA_REGISTERED_PESTICIDES_2026_07, EXT_UH_BANANA_ROTS_PD54 |
| Mango | anthracnose | leaf and fruit | no | supported | No verified recommendation found. | PH_BAFS_MANGO_GAP_2025, PH_FPA_REGISTERED_PESTICIDES_2026_07 |
| Mango | powdery_mildew | leaf | no | partially_supported | No verified recommendation found. | PH_FPA_REGISTERED_PESTICIDES_2026_07, EXT_UF_MANGO_DISEASES |
| Mango | scab | fruit | no | supported | No verified recommendation found. | PH_BAFS_MANGO_GAP_2025, PH_FPA_REGISTERED_PESTICIDES_2026_07 |
| Mango | blight | leaf | no | unresolved_term | No verified recommendation found. | PH_BAFS_MANGO_GAP_2025, PH_PCAARRD_MANGO_PEST_DISEASE |
| Mango | mold | fruit | yes | supported | No verified recommendation found. | PH_BAFS_MANGO_GAP_2025, PH_FPA_REGISTERED_PESTICIDES_2026_07 |
| Mango | rot | fruit | yes | supported | No verified recommendation found. | PH_BAFS_MANGO_GAP_2025, PH_FPA_REGISTERED_PESTICIDES_2026_07, EXT_UCD_MANGO_POSTHARVEST |

## Explicit exclusions

- Banana / powdery_mildew: Explicit project exclusion: powdery mildew does not apply to banana.
- Banana / scab: Explicit project exclusion: scab does not apply to banana.
- Mango / rust: Explicit project exclusion: rust does not apply to mango.

## Detailed rows

### R01. Papaya — Anthracnose (leaf and fruit)

Evidence status: supported
Awareness only: no
Sources: PH_UPLB_PAPAYA_ANTHRACNOSE, EXT_UF_PAPAYA_DISEASES

Symptoms EN: Possible indicators include water-soaked spots that enlarge, darken, and become sunken on maturing fruit. Philippine research confirms papaya anthracnose caused by Colletotrichum species. Leaf involvement is retained because it is in the project applicability matrix, but the reviewed Philippine source is strongest for fruit.
Symptoms FIL: Draft translation pending expert review: Possible indicators include water-soaked spots that enlarge, darken, and become sunken on maturing fruit. Philippine research confirms papaya anthracnose caused by Colletotrichum species. Leaf involvement is retained because it is in the project applicability matrix, but the reviewed Philippine source is strongest for fruit.

Prevention EN: Improve aeration and remove diseased fruit and plant material. Avoid fruit injury during handling.
Prevention FIL: Draft translation pending expert review: Improve aeration and remove diseased fruit and plant material. Avoid fruit injury during handling.

Cultural management EN: Use sanitation and careful harvest/post-harvest handling.
Cultural management FIL: Draft translation pending expert review: Use sanitation and careful harvest/post-harvest handling.

Sanitation EN: Remove infected or decaying fruit and plant debris from contact with sound produce.
Sanitation FIL: Draft translation pending expert review: Remove infected or decaying fruit and plant debris from contact with sound produce.

Day 1 EN: Record separate Day 1 reference photos of the affected leaf and fruit. Note existing lesion number, size, color, tissue collapse, visible growth, and fruit softness.
Day 1 FIL: Kumuha ng hiwalay na Day 1 reference photo ng apektadong dahon at bunga. Itala ang bilang, laki, kulay ng lesions, tissue collapse, nakikitang growth, at lambot ng bunga.
Day 5 EN: Compare with Day 1. Record new lesions, enlargement of existing lesions, increased discoloration, wilting, leaf drop, or fruit softening. Do not use improvement as proof of disease identity.
Day 5 FIL: Ihambing sa Day 1. Itala ang bagong lesions, paglaki ng dating lesions, pagdami ng discoloration, pagkalanta, paglagas ng dahon, o paglambot ng bunga. Huwag gamitin ang pagbuti bilang patunay ng disease identity.
Day 10 EN: Compare with Days 1 and 5. Record whether visible spread stopped or continued. Seek expert confirmation if new tissue becomes affected or deterioration continues.
Day 10 FIL: Ihambing sa Day 1 at Day 5. Itala kung huminto o nagpatuloy ang nakikitang pagkalat. Humingi ng expert confirmation kung may bagong tissue na naapektuhan o nagpapatuloy ang pagkasira.

Pesticide: No verified recommendation found.
Reason: No accessible Philippine product label was verified with the complete required use conditions and restrictions. FPA registration-table matches, where present, are recorded only as regulatory leads for reviewer follow-up.

Uncertainty EN: Because leaf-specific Philippine symptom evidence was not located, seek confirmation when leaf signs are the main finding.
Uncertainty FIL: Draft translation pending expert review: Because leaf-specific Philippine symptom evidence was not located, seek confirmation when leaf signs are the main finding.

### R02. Papaya — Powdery mildew (leaf)

Evidence status: partially_supported
Awareness only: no
Sources: PH_FPA_REGISTERED_PESTICIDES_2026_07, EXT_UF_PAPAYA_DISEASES

Symptoms EN: Possible indicators include superficial white powdery growth on leaves, pale yellow areas, and later dead areas that may create a shot-hole appearance. The symptom description is from non-Philippine extension evidence.
Symptoms FIL: Draft translation pending expert review: Possible indicators include superficial white powdery growth on leaves, pale yellow areas, and later dead areas that may create a shot-hole appearance. The symptom description is from non-Philippine extension evidence.

Prevention EN: Remove heavily affected leaves and improve aeration around plants.
Prevention FIL: Draft translation pending expert review: Remove heavily affected leaves and improve aeration around plants.

Cultural management EN: Reduce dense foliage and conditions that keep the canopy humid where practical.
Cultural management FIL: Draft translation pending expert review: Reduce dense foliage and conditions that keep the canopy humid where practical.

Sanitation EN: Remove affected leaves from the immediate growing area instead of leaving them beside the plant.
Sanitation FIL: Draft translation pending expert review: Remove affected leaves from the immediate growing area instead of leaving them beside the plant.

Day 1 EN: Record a clear Day 1 reference photo. Note the number, size, color, and distribution of visible leaf lesions, powdery growth, pustules, browning, wilting, or leaf drop already present.
Day 1 FIL: Kumuha ng malinaw na Day 1 reference photo. Itala ang bilang, laki, kulay, at lokasyon ng nakikitang lesions, powdery growth, pustules, pag-brown, pagkalanta, o paglagas ng dahon na naroon na.
Day 5 EN: Compare with Day 1. Record whether new affected leaves or lesions appeared, whether existing areas expanded, and whether wilting or leaf drop increased. Do not treat visual improvement as confirmation of the disease identity.
Day 5 FIL: Ihambing sa Day 1. Itala kung may bagong apektadong dahon o lesions, kung lumaki ang dating apektadong bahagi, at kung dumami ang pagkalanta o paglagas. Huwag ituring ang pagbuti sa itsura bilang kumpirmasyon ng disease identity.
Day 10 EN: Compare with Days 1 and 5. Record whether spread stopped, remained similar, or increased. Seek expert confirmation if lesions continue expanding, new leaves become affected, or plant vigor declines.
Day 10 FIL: Ihambing sa Day 1 at Day 5. Itala kung huminto, nanatili, o dumami ang pagkalat. Humingi ng expert confirmation kung patuloy lumalaki ang lesions, may bagong apektadong dahon, o humihina ang halaman.

Pesticide: No verified recommendation found.
Reason: No accessible Philippine product label was verified with the complete required use conditions and restrictions. FPA registration-table matches, where present, are recorded only as regulatory leads for reviewer follow-up.

Uncertainty EN: FPA registration evidence supports papaya as a target crop for powdery mildew products, but the reviewed symptom and cultural-management text is non-Philippine and needs local expert confirmation.
Uncertainty FIL: Draft translation pending expert review: FPA registration evidence supports papaya as a target crop for powdery mildew products, but the reviewed symptom and cultural-management text is non-Philippine and needs local expert confirmation.

### R03. Papaya — Rust (leaf)

Evidence status: insufficient_evidence
Awareness only: no
Sources: No authoritative crop-specific source verified

Symptoms EN: Unavailable. No authoritative crop-specific symptom source was verified in this research pass.
Symptoms FIL: Draft translation pending expert review: Unavailable. No authoritative crop-specific symptom source was verified in this research pass.

Prevention EN: Unavailable.
Prevention FIL: Draft translation pending expert review: Unavailable.

Cultural management EN: Unavailable.
Cultural management FIL: Draft translation pending expert review: Unavailable.

Sanitation EN: Unavailable.
Sanitation FIL: Draft translation pending expert review: Unavailable.

Day 1 EN: Record a clear Day 1 reference photo. Note the number, size, color, and distribution of visible leaf lesions, powdery growth, pustules, browning, wilting, or leaf drop already present.
Day 1 FIL: Kumuha ng malinaw na Day 1 reference photo. Itala ang bilang, laki, kulay, at lokasyon ng nakikitang lesions, powdery growth, pustules, pag-brown, pagkalanta, o paglagas ng dahon na naroon na.
Day 5 EN: Compare with Day 1. Record whether new affected leaves or lesions appeared, whether existing areas expanded, and whether wilting or leaf drop increased. Do not treat visual improvement as confirmation of the disease identity.
Day 5 FIL: Ihambing sa Day 1. Itala kung may bagong apektadong dahon o lesions, kung lumaki ang dating apektadong bahagi, at kung dumami ang pagkalanta o paglagas. Huwag ituring ang pagbuti sa itsura bilang kumpirmasyon ng disease identity.
Day 10 EN: Compare with Days 1 and 5. Record whether spread stopped, remained similar, or increased. Seek expert confirmation if lesions continue expanding, new leaves become affected, or plant vigor declines.
Day 10 FIL: Ihambing sa Day 1 at Day 5. Itala kung huminto, nanatili, o dumami ang pagkalat. Humingi ng expert confirmation kung patuloy lumalaki ang lesions, may bagong apektadong dahon, o humihina ang halaman.

Pesticide: No verified recommendation found.
Reason: No accessible Philippine product label was verified with the complete required use conditions and restrictions. FPA registration-table matches, where present, are recorded only as regulatory leads for reviewer follow-up.

Uncertainty EN: The relationship is retained because it is required by the project applicability matrix. Philippine authoritative evidence still needs to be supplied or confirmed by the reviewer.
Uncertainty FIL: Draft translation pending expert review: The relationship is retained because it is required by the project applicability matrix. Philippine authoritative evidence still needs to be supplied or confirmed by the reviewer.

### R04. Papaya — Scab (fruit)

Evidence status: insufficient_evidence
Awareness only: no
Sources: No authoritative crop-specific source verified

Symptoms EN: Unavailable. No authoritative crop-specific papaya scab source was verified in this research pass.
Symptoms FIL: Draft translation pending expert review: Unavailable. No authoritative crop-specific papaya scab source was verified in this research pass.

Prevention EN: Unavailable.
Prevention FIL: Draft translation pending expert review: Unavailable.

Cultural management EN: Unavailable.
Cultural management FIL: Draft translation pending expert review: Unavailable.

Sanitation EN: Unavailable.
Sanitation FIL: Draft translation pending expert review: Unavailable.

Day 1 EN: Record a clear Day 1 reference photo. Note the number, size, color, depth, softness, cracking, visible fungal growth, and location of affected fruit areas. Keep questionable fruit separate from sound fruit.
Day 1 FIL: Kumuha ng malinaw na Day 1 reference photo. Itala ang bilang, laki, kulay, lalim, lambot, bitak, nakikitang fungal growth, at lokasyon ng apektadong bahagi ng bunga. Ihiwalay ang kahina-hinalang bunga sa maayos na bunga.
Day 5 EN: Compare with Day 1. Record whether new spots appeared, existing spots enlarged or softened, discoloration deepened, or visible mold or rot spread. Remove fruit from the usable lot if deterioration is progressing.
Day 5 FIL: Ihambing sa Day 1. Itala kung may bagong batik, lumaki o lumambot ang dating batik, lumalim ang discoloration, o kumalat ang mold o rot. Alisin sa usable lot ang bunga kung patuloy ang pagkasira.
Day 10 EN: Compare with Days 1 and 5. Record whether deterioration stopped or progressed. Seek expert confirmation when lesions continue spreading, tissue becomes soft or watery, mold increases, or fruit quality is uncertain.
Day 10 FIL: Ihambing sa Day 1 at Day 5. Itala kung huminto o lumala ang pagkasira. Humingi ng expert confirmation kung patuloy kumakalat ang lesions, lumalambot o nagiging watery ang tissue, dumarami ang mold, o hindi tiyak ang kalidad ng bunga.

Pesticide: No verified recommendation found.
Reason: No accessible Philippine product label was verified with the complete required use conditions and restrictions. FPA registration-table matches, where present, are recorded only as regulatory leads for reviewer follow-up.

Uncertainty EN: Retained only because it is required by the project applicability matrix. Do not expose a diagnostic description until the exact condition is confirmed.
Uncertainty FIL: Draft translation pending expert review: Retained only because it is required by the project applicability matrix. Do not expose a diagnostic description until the exact condition is confirmed.

### R05. Papaya — Blight (leaf)

Evidence status: unresolved_term
Awareness only: no
Sources: PH_BPI_PAPAYA_GUIDE, EXT_UF_PAPAYA_DISEASES

Symptoms EN: The broad term is unresolved. The BPI guide documents Phytophthora rot with root, wilt, trunk-canker, and fruit-rot signs, while non-Philippine extension material uses the term Phytophthora blight for several diseases. This does not establish a leaf-only Philippine 'blight' entity.
Symptoms FIL: Draft translation pending expert review: The broad term is unresolved. The BPI guide documents Phytophthora rot with root, wilt, trunk-canker, and fruit-rot signs, while non-Philippine extension material uses the term Phytophthora blight for several diseases. This does not establish a leaf-only Philippine 'blight' entity.

Prevention EN: Do not assign disease-specific prevention until the reviewer identifies the exact source-defined blight condition.
Prevention FIL: Draft translation pending expert review: Do not assign disease-specific prevention until the reviewer identifies the exact source-defined blight condition.

Cultural management EN: Unavailable pending disease-term resolution.
Cultural management FIL: Draft translation pending expert review: Unavailable pending disease-term resolution.

Sanitation EN: Use general sanitation only as a non-diagnostic precaution.
Sanitation FIL: Draft translation pending expert review: Use general sanitation only as a non-diagnostic precaution.

Day 1 EN: Record a clear Day 1 reference photo. Note the number, size, color, and distribution of visible leaf lesions, powdery growth, pustules, browning, wilting, or leaf drop already present.
Day 1 FIL: Kumuha ng malinaw na Day 1 reference photo. Itala ang bilang, laki, kulay, at lokasyon ng nakikitang lesions, powdery growth, pustules, pag-brown, pagkalanta, o paglagas ng dahon na naroon na.
Day 5 EN: Compare with Day 1. Record whether new affected leaves or lesions appeared, whether existing areas expanded, and whether wilting or leaf drop increased. Do not treat visual improvement as confirmation of the disease identity.
Day 5 FIL: Ihambing sa Day 1. Itala kung may bagong apektadong dahon o lesions, kung lumaki ang dating apektadong bahagi, at kung dumami ang pagkalanta o paglagas. Huwag ituring ang pagbuti sa itsura bilang kumpirmasyon ng disease identity.
Day 10 EN: Compare with Days 1 and 5. Record whether spread stopped, remained similar, or increased. Seek expert confirmation if lesions continue expanding, new leaves become affected, or plant vigor declines.
Day 10 FIL: Ihambing sa Day 1 at Day 5. Itala kung huminto, nanatili, o dumami ang pagkalat. Humingi ng expert confirmation kung patuloy lumalaki ang lesions, may bagong apektadong dahon, o humihina ang halaman.

Pesticide: No verified recommendation found.
Reason: No accessible Philippine product label was verified with the complete required use conditions and restrictions. FPA registration-table matches, where present, are recorded only as regulatory leads for reviewer follow-up.

Uncertainty EN: The project term blight must be mapped to a specific Philippine disease before production use.
Uncertainty FIL: Draft translation pending expert review: The project term blight must be mapped to a specific Philippine disease before production use.

### R06. Papaya — Mold (fruit)

Evidence status: unresolved_term
Awareness only: yes
Sources: No authoritative crop-specific source verified

Symptoms EN: Awareness only. 'Mold' is not treated as a confirmed disease identity. Look for visible fungal growth, spreading discoloration, softening, or decay and seek confirmation of the specific cause.
Symptoms FIL: Draft translation pending expert review: Awareness only. 'Mold' is not treated as a confirmed disease identity. Look for visible fungal growth, spreading discoloration, softening, or decay and seek confirmation of the specific cause.

Prevention EN: Isolate affected fruit from sound fruit and keep handling areas clean and dry.
Prevention FIL: Draft translation pending expert review: Isolate affected fruit from sound fruit and keep handling areas clean and dry.

Cultural management EN: Use careful post-harvest handling to limit wounds and cross-contamination.
Cultural management FIL: Draft translation pending expert review: Use careful post-harvest handling to limit wounds and cross-contamination.

Sanitation EN: Remove visibly moldy or decaying fruit from the usable lot and clean contacted surfaces.
Sanitation FIL: Draft translation pending expert review: Remove visibly moldy or decaying fruit from the usable lot and clean contacted surfaces.

Day 1 EN: Record a clear Day 1 reference photo. Note the number, size, color, depth, softness, cracking, visible fungal growth, and location of affected fruit areas. Keep questionable fruit separate from sound fruit.
Day 1 FIL: Kumuha ng malinaw na Day 1 reference photo. Itala ang bilang, laki, kulay, lalim, lambot, bitak, nakikitang fungal growth, at lokasyon ng apektadong bahagi ng bunga. Ihiwalay ang kahina-hinalang bunga sa maayos na bunga.
Day 5 EN: Compare with Day 1. Record whether new spots appeared, existing spots enlarged or softened, discoloration deepened, or visible mold or rot spread. Remove fruit from the usable lot if deterioration is progressing.
Day 5 FIL: Ihambing sa Day 1. Itala kung may bagong batik, lumaki o lumambot ang dating batik, lumalim ang discoloration, o kumalat ang mold o rot. Alisin sa usable lot ang bunga kung patuloy ang pagkasira.
Day 10 EN: Compare with Days 1 and 5. Record whether deterioration stopped or progressed. Seek expert confirmation when lesions continue spreading, tissue becomes soft or watery, mold increases, or fruit quality is uncertain.
Day 10 FIL: Ihambing sa Day 1 at Day 5. Itala kung huminto o lumala ang pagkasira. Humingi ng expert confirmation kung patuloy kumakalat ang lesions, lumalambot o nagiging watery ang tissue, dumarami ang mold, o hindi tiyak ang kalidad ng bunga.

Pesticide: No verified recommendation found.
Reason: No accessible Philippine product label was verified with the complete required use conditions and restrictions. FPA registration-table matches, where present, are recorded only as regulatory leads for reviewer follow-up.

Uncertainty EN: Specific mold identity is unresolved. Escalate to an agriculturist or plant pathologist.
Uncertainty FIL: Draft translation pending expert review: Specific mold identity is unresolved. Escalate to an agriculturist or plant pathologist.

### R07. Papaya — Rot (fruit)

Evidence status: supported
Awareness only: yes
Sources: PH_BPI_PAPAYA_GUIDE

Symptoms EN: Awareness only. BPI documents Phytophthora rot, including fruit rot, with initially water-soaked affected areas that may later develop cottony surface growth and spores.
Symptoms FIL: Draft translation pending expert review: Awareness only. BPI documents Phytophthora rot, including fruit rot, with initially water-soaked affected areas that may later develop cottony surface growth and spores.

Prevention EN: Maintain good field drainage and do not replant in areas where the documented disease previously occurred.
Prevention FIL: Draft translation pending expert review: Maintain good field drainage and do not replant in areas where the documented disease previously occurred.

Cultural management EN: Remove and destroy fallen infected trunks and fruits.
Cultural management FIL: Draft translation pending expert review: Remove and destroy fallen infected trunks and fruits.

Sanitation EN: Separate rotting fruit from sound fruit and remove fallen diseased material from the field.
Sanitation FIL: Draft translation pending expert review: Separate rotting fruit from sound fruit and remove fallen diseased material from the field.

Day 1 EN: Record a clear Day 1 reference photo. Note the number, size, color, depth, softness, cracking, visible fungal growth, and location of affected fruit areas. Keep questionable fruit separate from sound fruit.
Day 1 FIL: Kumuha ng malinaw na Day 1 reference photo. Itala ang bilang, laki, kulay, lalim, lambot, bitak, nakikitang fungal growth, at lokasyon ng apektadong bahagi ng bunga. Ihiwalay ang kahina-hinalang bunga sa maayos na bunga.
Day 5 EN: Compare with Day 1. Record whether new spots appeared, existing spots enlarged or softened, discoloration deepened, or visible mold or rot spread. Remove fruit from the usable lot if deterioration is progressing.
Day 5 FIL: Ihambing sa Day 1. Itala kung may bagong batik, lumaki o lumambot ang dating batik, lumalim ang discoloration, o kumalat ang mold o rot. Alisin sa usable lot ang bunga kung patuloy ang pagkasira.
Day 10 EN: Compare with Days 1 and 5. Record whether deterioration stopped or progressed. Seek expert confirmation when lesions continue spreading, tissue becomes soft or watery, mold increases, or fruit quality is uncertain.
Day 10 FIL: Ihambing sa Day 1 at Day 5. Itala kung huminto o lumala ang pagkasira. Humingi ng expert confirmation kung patuloy kumakalat ang lesions, lumalambot o nagiging watery ang tissue, dumarami ang mold, o hindi tiyak ang kalidad ng bunga.

Pesticide: No verified recommendation found.
Reason: No accessible Philippine product label was verified with the complete required use conditions and restrictions. FPA registration-table matches, where present, are recorded only as regulatory leads for reviewer follow-up.

Uncertainty EN: The app should display this as fruit-rot awareness, not a diagnosis of Phytophthora rot, unless the specific condition is confirmed.
Uncertainty FIL: Draft translation pending expert review: The app should display this as fruit-rot awareness, not a diagnosis of Phytophthora rot, unless the specific condition is confirmed.

### R08. Banana — Anthracnose (leaf and fruit)

Evidence status: supported
Awareness only: no
Sources: PH_PCAARRD_BANANA_HIYEAST, PH_FPA_REGISTERED_PESTICIDES_2026_07, EXT_UH_BANANA_ROTS_PD54

Symptoms EN: Philippine evidence supports banana anthracnose as a post-harvest fruit disease. Possible fruit signs include brown to black sunken peel spots. Leaf applicability remains in the project matrix but was not verified from the reviewed Philippine sources.
Symptoms FIL: Draft translation pending expert review: Philippine evidence supports banana anthracnose as a post-harvest fruit disease. Possible fruit signs include brown to black sunken peel spots. Leaf applicability remains in the project matrix but was not verified from the reviewed Philippine sources.

Prevention EN: Use field sanitation and careful fruit handling to reduce wounds and contamination.
Prevention FIL: Draft translation pending expert review: Use field sanitation and careful fruit handling to reduce wounds and contamination.

Cultural management EN: Remove dead or dying banana tissue that may harbor post-harvest pathogens and maintain clean handling equipment.
Cultural management FIL: Draft translation pending expert review: Remove dead or dying banana tissue that may harbor post-harvest pathogens and maintain clean handling equipment.

Sanitation EN: Keep questionable fruit separate and clean packing/handling surfaces.
Sanitation FIL: Draft translation pending expert review: Keep questionable fruit separate and clean packing/handling surfaces.

Day 1 EN: Record separate Day 1 reference photos of the affected leaf and fruit. Note existing lesion number, size, color, tissue collapse, visible growth, and fruit softness.
Day 1 FIL: Kumuha ng hiwalay na Day 1 reference photo ng apektadong dahon at bunga. Itala ang bilang, laki, kulay ng lesions, tissue collapse, nakikitang growth, at lambot ng bunga.
Day 5 EN: Compare with Day 1. Record new lesions, enlargement of existing lesions, increased discoloration, wilting, leaf drop, or fruit softening. Do not use improvement as proof of disease identity.
Day 5 FIL: Ihambing sa Day 1. Itala ang bagong lesions, paglaki ng dating lesions, pagdami ng discoloration, pagkalanta, paglagas ng dahon, o paglambot ng bunga. Huwag gamitin ang pagbuti bilang patunay ng disease identity.
Day 10 EN: Compare with Days 1 and 5. Record whether visible spread stopped or continued. Seek expert confirmation if new tissue becomes affected or deterioration continues.
Day 10 FIL: Ihambing sa Day 1 at Day 5. Itala kung huminto o nagpatuloy ang nakikitang pagkalat. Humingi ng expert confirmation kung may bagong tissue na naapektuhan o nagpapatuloy ang pagkasira.

Pesticide: No verified recommendation found.
Reason: No accessible Philippine product label was verified with the complete required use conditions and restrictions. FPA registration-table matches, where present, are recorded only as regulatory leads for reviewer follow-up.

Uncertainty EN: The reviewed Philippine evidence is strongest for fruit. Seek expert confirmation before presenting leaf anthracnose guidance.
Uncertainty FIL: Draft translation pending expert review: The reviewed Philippine evidence is strongest for fruit. Seek expert confirmation before presenting leaf anthracnose guidance.

### R09. Banana — Rust (leaf)

Evidence status: partially_supported
Awareness only: no
Sources: PH_FPA_REGISTERED_PESTICIDES_2026_07, EXT_UOG_BANANA_RUST

Symptoms EN: The current FPA list contains banana 'rust' among target diseases for several chlorothalonil products. A non-Philippine Pacific extension source describes Uredo musae rust as pustules on both leaf surfaces, usually more numerous below, sometimes with short dark streaks.
Symptoms FIL: Draft translation pending expert review: The current FPA list contains banana 'rust' among target diseases for several chlorothalonil products. A non-Philippine Pacific extension source describes Uredo musae rust as pustules on both leaf surfaces, usually more numerous below, sometimes with short dark streaks.

Prevention EN: Unavailable from a Philippine crop-disease management source in this research pass.
Prevention FIL: Draft translation pending expert review: Unavailable from a Philippine crop-disease management source in this research pass.

Cultural management EN: Unavailable pending Philippine expert confirmation of the exact rust entity.
Cultural management FIL: Draft translation pending expert review: Unavailable pending Philippine expert confirmation of the exact rust entity.

Sanitation EN: Avoid moving visibly affected plant material between fields until the condition is confirmed.
Sanitation FIL: Draft translation pending expert review: Avoid moving visibly affected plant material between fields until the condition is confirmed.

Day 1 EN: Record a clear Day 1 reference photo. Note the number, size, color, and distribution of visible leaf lesions, powdery growth, pustules, browning, wilting, or leaf drop already present.
Day 1 FIL: Kumuha ng malinaw na Day 1 reference photo. Itala ang bilang, laki, kulay, at lokasyon ng nakikitang lesions, powdery growth, pustules, pag-brown, pagkalanta, o paglagas ng dahon na naroon na.
Day 5 EN: Compare with Day 1. Record whether new affected leaves or lesions appeared, whether existing areas expanded, and whether wilting or leaf drop increased. Do not treat visual improvement as confirmation of the disease identity.
Day 5 FIL: Ihambing sa Day 1. Itala kung may bagong apektadong dahon o lesions, kung lumaki ang dating apektadong bahagi, at kung dumami ang pagkalanta o paglagas. Huwag ituring ang pagbuti sa itsura bilang kumpirmasyon ng disease identity.
Day 10 EN: Compare with Days 1 and 5. Record whether spread stopped, remained similar, or increased. Seek expert confirmation if lesions continue expanding, new leaves become affected, or plant vigor declines.
Day 10 FIL: Ihambing sa Day 1 at Day 5. Itala kung huminto, nanatili, o dumami ang pagkalat. Humingi ng expert confirmation kung patuloy lumalaki ang lesions, may bagong apektadong dahon, o humihina ang halaman.

Pesticide: No verified recommendation found.
Reason: No accessible Philippine product label was verified with the complete required use conditions and restrictions. FPA registration-table matches, where present, are recorded only as regulatory leads for reviewer follow-up.

Uncertainty EN: The exact Philippine pathogen/entity behind the FPA-list term rust was not established from the registration table. Expert confirmation is required.
Uncertainty FIL: Draft translation pending expert review: The exact Philippine pathogen/entity behind the FPA-list term rust was not established from the registration table. Expert confirmation is required.

### R10. Banana — Blight (leaf)

Evidence status: unresolved_term
Awareness only: no
Sources: No authoritative crop-specific source verified

Symptoms EN: Unavailable. Blight is too broad and no specific Philippine banana leaf disease matching this project term was verified.
Symptoms FIL: Draft translation pending expert review: Unavailable. Blight is too broad and no specific Philippine banana leaf disease matching this project term was verified.

Prevention EN: Unavailable.
Prevention FIL: Draft translation pending expert review: Unavailable.

Cultural management EN: Unavailable.
Cultural management FIL: Draft translation pending expert review: Unavailable.

Sanitation EN: Unavailable.
Sanitation FIL: Draft translation pending expert review: Unavailable.

Day 1 EN: Record a clear Day 1 reference photo. Note the number, size, color, and distribution of visible leaf lesions, powdery growth, pustules, browning, wilting, or leaf drop already present.
Day 1 FIL: Kumuha ng malinaw na Day 1 reference photo. Itala ang bilang, laki, kulay, at lokasyon ng nakikitang lesions, powdery growth, pustules, pag-brown, pagkalanta, o paglagas ng dahon na naroon na.
Day 5 EN: Compare with Day 1. Record whether new affected leaves or lesions appeared, whether existing areas expanded, and whether wilting or leaf drop increased. Do not treat visual improvement as confirmation of the disease identity.
Day 5 FIL: Ihambing sa Day 1. Itala kung may bagong apektadong dahon o lesions, kung lumaki ang dating apektadong bahagi, at kung dumami ang pagkalanta o paglagas. Huwag ituring ang pagbuti sa itsura bilang kumpirmasyon ng disease identity.
Day 10 EN: Compare with Days 1 and 5. Record whether spread stopped, remained similar, or increased. Seek expert confirmation if lesions continue expanding, new leaves become affected, or plant vigor declines.
Day 10 FIL: Ihambing sa Day 1 at Day 5. Itala kung huminto, nanatili, o dumami ang pagkalat. Humingi ng expert confirmation kung patuloy lumalaki ang lesions, may bagong apektadong dahon, o humihina ang halaman.

Pesticide: No verified recommendation found.
Reason: No accessible Philippine product label was verified with the complete required use conditions and restrictions. FPA registration-table matches, where present, are recorded only as regulatory leads for reviewer follow-up.

Uncertainty EN: Retain as a project placeholder only. A qualified reviewer must map it to a specific disease or reject the relationship.
Uncertainty FIL: Draft translation pending expert review: Retain as a project placeholder only. A qualified reviewer must map it to a specific disease or reject the relationship.

### R11. Banana — Mold (fruit)

Evidence status: supported
Awareness only: yes
Sources: PH_FPA_REGISTERED_PESTICIDES_2026_07

Symptoms EN: Awareness only. The FPA list includes fungal crown mold as a post-harvest condition of banana. Generic fruit mold should not be presented as a confirmed diagnosis.
Symptoms FIL: Draft translation pending expert review: Awareness only. The FPA list includes fungal crown mold as a post-harvest condition of banana. Generic fruit mold should not be presented as a confirmed diagnosis.

Prevention EN: Isolate visibly affected fruit and keep post-harvest handling areas clean.
Prevention FIL: Draft translation pending expert review: Isolate visibly affected fruit and keep post-harvest handling areas clean.

Cultural management EN: Avoid fruit injury and cross-contamination during handling.
Cultural management FIL: Draft translation pending expert review: Avoid fruit injury and cross-contamination during handling.

Sanitation EN: Remove affected crowns or fruit from the usable lot and clean contacted equipment and surfaces.
Sanitation FIL: Draft translation pending expert review: Remove affected crowns or fruit from the usable lot and clean contacted equipment and surfaces.

Day 1 EN: Record a clear Day 1 reference photo. Note the number, size, color, depth, softness, cracking, visible fungal growth, and location of affected fruit areas. Keep questionable fruit separate from sound fruit.
Day 1 FIL: Kumuha ng malinaw na Day 1 reference photo. Itala ang bilang, laki, kulay, lalim, lambot, bitak, nakikitang fungal growth, at lokasyon ng apektadong bahagi ng bunga. Ihiwalay ang kahina-hinalang bunga sa maayos na bunga.
Day 5 EN: Compare with Day 1. Record whether new spots appeared, existing spots enlarged or softened, discoloration deepened, or visible mold or rot spread. Remove fruit from the usable lot if deterioration is progressing.
Day 5 FIL: Ihambing sa Day 1. Itala kung may bagong batik, lumaki o lumambot ang dating batik, lumalim ang discoloration, o kumalat ang mold o rot. Alisin sa usable lot ang bunga kung patuloy ang pagkasira.
Day 10 EN: Compare with Days 1 and 5. Record whether deterioration stopped or progressed. Seek expert confirmation when lesions continue spreading, tissue becomes soft or watery, mold increases, or fruit quality is uncertain.
Day 10 FIL: Ihambing sa Day 1 at Day 5. Itala kung huminto o lumala ang pagkasira. Humingi ng expert confirmation kung patuloy kumakalat ang lesions, lumalambot o nagiging watery ang tissue, dumarami ang mold, o hindi tiyak ang kalidad ng bunga.

Pesticide: No verified recommendation found.
Reason: No accessible Philippine product label was verified with the complete required use conditions and restrictions. FPA registration-table matches, where present, are recorded only as regulatory leads for reviewer follow-up.

Uncertainty EN: This row is awareness-only. The exact mold organism must be confirmed before disease-specific guidance.
Uncertainty FIL: Draft translation pending expert review: This row is awareness-only. The exact mold organism must be confirmed before disease-specific guidance.

### R12. Banana — Rot (fruit)

Evidence status: supported
Awareness only: yes
Sources: PH_PCAARRD_BANANA_HIYEAST, PH_FPA_REGISTERED_PESTICIDES_2026_07, EXT_UH_BANANA_ROTS_PD54

Symptoms EN: Awareness only. Crown rot is a documented post-harvest banana condition. Possible signs include brown-to-black discoloration of the cut crown surface progressing into deeper decay.
Symptoms FIL: Draft translation pending expert review: Awareness only. Crown rot is a documented post-harvest banana condition. Possible signs include brown-to-black discoloration of the cut crown surface progressing into deeper decay.

Prevention EN: Use field sanitation, clean handling water and equipment, and careful de-handing and fruit handling.
Prevention FIL: Draft translation pending expert review: Use field sanitation, clean handling water and equipment, and careful de-handing and fruit handling.

Cultural management EN: Remove dead tissues and post-harvest debris that may act as inoculum sources.
Cultural management FIL: Draft translation pending expert review: Remove dead tissues and post-harvest debris that may act as inoculum sources.

Sanitation EN: Separate affected fruit and clean equipment and surfaces that contacted decaying crowns.
Sanitation FIL: Draft translation pending expert review: Separate affected fruit and clean equipment and surfaces that contacted decaying crowns.

Day 1 EN: Record a clear Day 1 reference photo. Note the number, size, color, depth, softness, cracking, visible fungal growth, and location of affected fruit areas. Keep questionable fruit separate from sound fruit.
Day 1 FIL: Kumuha ng malinaw na Day 1 reference photo. Itala ang bilang, laki, kulay, lalim, lambot, bitak, nakikitang fungal growth, at lokasyon ng apektadong bahagi ng bunga. Ihiwalay ang kahina-hinalang bunga sa maayos na bunga.
Day 5 EN: Compare with Day 1. Record whether new spots appeared, existing spots enlarged or softened, discoloration deepened, or visible mold or rot spread. Remove fruit from the usable lot if deterioration is progressing.
Day 5 FIL: Ihambing sa Day 1. Itala kung may bagong batik, lumaki o lumambot ang dating batik, lumalim ang discoloration, o kumalat ang mold o rot. Alisin sa usable lot ang bunga kung patuloy ang pagkasira.
Day 10 EN: Compare with Days 1 and 5. Record whether deterioration stopped or progressed. Seek expert confirmation when lesions continue spreading, tissue becomes soft or watery, mold increases, or fruit quality is uncertain.
Day 10 FIL: Ihambing sa Day 1 at Day 5. Itala kung huminto o lumala ang pagkasira. Humingi ng expert confirmation kung patuloy kumakalat ang lesions, lumalambot o nagiging watery ang tissue, dumarami ang mold, o hindi tiyak ang kalidad ng bunga.

Pesticide: No verified recommendation found.
Reason: No accessible Philippine product label was verified with the complete required use conditions and restrictions. FPA registration-table matches, where present, are recorded only as regulatory leads for reviewer follow-up.

Uncertainty EN: Display as rot awareness unless crown rot is specifically confirmed.
Uncertainty FIL: Draft translation pending expert review: Display as rot awareness unless crown rot is specifically confirmed.

### R13. Mango — Anthracnose (leaf and fruit)

Evidence status: supported
Awareness only: no
Sources: PH_BAFS_MANGO_GAP_2025, PH_FPA_REGISTERED_PESTICIDES_2026_07

Symptoms EN: Possible indicators include irregular brown spots on young leaves, distorted mature leaves with shot-hole-like damage, blackening and withering of flowers, and brown-to-black sunken fruit spots.
Symptoms FIL: Draft translation pending expert review: Possible indicators include irregular brown spots on young leaves, distorted mature leaves with shot-hole-like damage, blackening and withering of flowers, and brown-to-black sunken fruit spots.

Prevention EN: Maintain light penetration and air circulation, collect disease-source debris, and bag fruit with appropriate materials.
Prevention FIL: Draft translation pending expert review: Maintain light penetration and air circulation, collect disease-source debris, and bag fruit with appropriate materials.

Cultural management EN: Prune after harvest, maintain tree vigor, and manage canopy humidity.
Cultural management FIL: Draft translation pending expert review: Prune after harvest, maintain tree vigor, and manage canopy humidity.

Sanitation EN: Collect and remove disease-source debris and keep post-harvest handling areas clean.
Sanitation FIL: Draft translation pending expert review: Collect and remove disease-source debris and keep post-harvest handling areas clean.

Day 1 EN: Record separate Day 1 reference photos of the affected leaf and fruit. Note existing lesion number, size, color, tissue collapse, visible growth, and fruit softness.
Day 1 FIL: Kumuha ng hiwalay na Day 1 reference photo ng apektadong dahon at bunga. Itala ang bilang, laki, kulay ng lesions, tissue collapse, nakikitang growth, at lambot ng bunga.
Day 5 EN: Compare with Day 1. Record new lesions, enlargement of existing lesions, increased discoloration, wilting, leaf drop, or fruit softening. Do not use improvement as proof of disease identity.
Day 5 FIL: Ihambing sa Day 1. Itala ang bagong lesions, paglaki ng dating lesions, pagdami ng discoloration, pagkalanta, paglagas ng dahon, o paglambot ng bunga. Huwag gamitin ang pagbuti bilang patunay ng disease identity.
Day 10 EN: Compare with Days 1 and 5. Record whether visible spread stopped or continued. Seek expert confirmation if new tissue becomes affected or deterioration continues.
Day 10 FIL: Ihambing sa Day 1 at Day 5. Itala kung huminto o nagpatuloy ang nakikitang pagkalat. Humingi ng expert confirmation kung may bagong tissue na naapektuhan o nagpapatuloy ang pagkasira.

Pesticide: No verified recommendation found.
Reason: No accessible Philippine product label was verified with the complete required use conditions and restrictions. FPA registration-table matches, where present, are recorded only as regulatory leads for reviewer follow-up.

Uncertainty EN: These signs are decision-support indicators only. Similar lesions have other possible causes, so seek confirmation when symptoms are severe or atypical.
Uncertainty FIL: Draft translation pending expert review: These signs are decision-support indicators only. Similar lesions have other possible causes, so seek confirmation when symptoms are severe or atypical.

### R14. Mango — Powdery mildew (leaf)

Evidence status: partially_supported
Awareness only: no
Sources: PH_FPA_REGISTERED_PESTICIDES_2026_07, EXT_UF_MANGO_DISEASES

Symptoms EN: Possible indicators include whitish powdery fungal growth on leaves. Non-Philippine extension evidence also notes lesions along leaf midribs or undersides that can darken as leaves mature.
Symptoms FIL: Draft translation pending expert review: Possible indicators include whitish powdery fungal growth on leaves. Non-Philippine extension evidence also notes lesions along leaf midribs or undersides that can darken as leaves mature.

Prevention EN: Prune crowded growth and maintain airflow and sunlight penetration.
Prevention FIL: Draft translation pending expert review: Prune crowded growth and maintain airflow and sunlight penetration.

Cultural management EN: Use canopy management and sanitation to reduce favorable humid microclimates and inoculum.
Cultural management FIL: Draft translation pending expert review: Use canopy management and sanitation to reduce favorable humid microclimates and inoculum.

Sanitation EN: Remove infected debris from around the tree.
Sanitation FIL: Draft translation pending expert review: Remove infected debris from around the tree.

Day 1 EN: Record a clear Day 1 reference photo. Note the number, size, color, and distribution of visible leaf lesions, powdery growth, pustules, browning, wilting, or leaf drop already present.
Day 1 FIL: Kumuha ng malinaw na Day 1 reference photo. Itala ang bilang, laki, kulay, at lokasyon ng nakikitang lesions, powdery growth, pustules, pag-brown, pagkalanta, o paglagas ng dahon na naroon na.
Day 5 EN: Compare with Day 1. Record whether new affected leaves or lesions appeared, whether existing areas expanded, and whether wilting or leaf drop increased. Do not treat visual improvement as confirmation of the disease identity.
Day 5 FIL: Ihambing sa Day 1. Itala kung may bagong apektadong dahon o lesions, kung lumaki ang dating apektadong bahagi, at kung dumami ang pagkalanta o paglagas. Huwag ituring ang pagbuti sa itsura bilang kumpirmasyon ng disease identity.
Day 10 EN: Compare with Days 1 and 5. Record whether spread stopped, remained similar, or increased. Seek expert confirmation if lesions continue expanding, new leaves become affected, or plant vigor declines.
Day 10 FIL: Ihambing sa Day 1 at Day 5. Itala kung huminto, nanatili, o dumami ang pagkalat. Humingi ng expert confirmation kung patuloy lumalaki ang lesions, may bagong apektadong dahon, o humihina ang halaman.

Pesticide: No verified recommendation found.
Reason: No accessible Philippine product label was verified with the complete required use conditions and restrictions. FPA registration-table matches, where present, are recorded only as regulatory leads for reviewer follow-up.

Uncertainty EN: FPA supports the mango-powdery-mildew crop-target relationship, but the symptom/cultural wording used here is non-Philippine and needs expert confirmation.
Uncertainty FIL: Draft translation pending expert review: FPA supports the mango-powdery-mildew crop-target relationship, but the symptom/cultural wording used here is non-Philippine and needs expert confirmation.

### R15. Mango — Scab (fruit)

Evidence status: supported
Awareness only: no
Sources: PH_BAFS_MANGO_GAP_2025, PH_FPA_REGISTERED_PESTICIDES_2026_07

Symptoms EN: Possible signs on young fruit include grayish-brown spots with dark irregular margins. Enlarging spots may crack and form fissured corky tissue.
Symptoms FIL: Draft translation pending expert review: Possible signs on young fruit include grayish-brown spots with dark irregular margins. Enlarging spots may crack and form fissured corky tissue.

Prevention EN: Maintain good light penetration and air circulation, use sanitation and pruning, collect disease-source debris, and bag fruit with appropriate materials.
Prevention FIL: Draft translation pending expert review: Maintain good light penetration and air circulation, use sanitation and pruning, collect disease-source debris, and bag fruit with appropriate materials.

Cultural management EN: Prune after harvest to improve ventilation and reduce canopy humidity.
Cultural management FIL: Draft translation pending expert review: Prune after harvest to improve ventilation and reduce canopy humidity.

Sanitation EN: Remove disease-source plant debris from the orchard.
Sanitation FIL: Draft translation pending expert review: Remove disease-source plant debris from the orchard.

Day 1 EN: Record a clear Day 1 reference photo. Note the number, size, color, depth, softness, cracking, visible fungal growth, and location of affected fruit areas. Keep questionable fruit separate from sound fruit.
Day 1 FIL: Kumuha ng malinaw na Day 1 reference photo. Itala ang bilang, laki, kulay, lalim, lambot, bitak, nakikitang fungal growth, at lokasyon ng apektadong bahagi ng bunga. Ihiwalay ang kahina-hinalang bunga sa maayos na bunga.
Day 5 EN: Compare with Day 1. Record whether new spots appeared, existing spots enlarged or softened, discoloration deepened, or visible mold or rot spread. Remove fruit from the usable lot if deterioration is progressing.
Day 5 FIL: Ihambing sa Day 1. Itala kung may bagong batik, lumaki o lumambot ang dating batik, lumalim ang discoloration, o kumalat ang mold o rot. Alisin sa usable lot ang bunga kung patuloy ang pagkasira.
Day 10 EN: Compare with Days 1 and 5. Record whether deterioration stopped or progressed. Seek expert confirmation when lesions continue spreading, tissue becomes soft or watery, mold increases, or fruit quality is uncertain.
Day 10 FIL: Ihambing sa Day 1 at Day 5. Itala kung huminto o lumala ang pagkasira. Humingi ng expert confirmation kung patuloy kumakalat ang lesions, lumalambot o nagiging watery ang tissue, dumarami ang mold, o hindi tiyak ang kalidad ng bunga.

Pesticide: No verified recommendation found.
Reason: No accessible Philippine product label was verified with the complete required use conditions and restrictions. FPA registration-table matches, where present, are recorded only as regulatory leads for reviewer follow-up.

Uncertainty EN: Fruit injuries and other diseases can resemble scab. Seek expert confirmation for uncertain lesions.
Uncertainty FIL: Draft translation pending expert review: Fruit injuries and other diseases can resemble scab. Seek expert confirmation for uncertain lesions.

### R16. Mango — Blight (leaf)

Evidence status: unresolved_term
Awareness only: no
Sources: PH_BAFS_MANGO_GAP_2025, PH_PCAARRD_MANGO_PEST_DISEASE

Symptoms EN: The term is unresolved for the required leaf-only scope. Philippine mango sources use 'blossom blight' in connection with anthracnose and inflorescences, not as a separate leaf-only disease entity.
Symptoms FIL: Draft translation pending expert review: The term is unresolved for the required leaf-only scope. Philippine mango sources use 'blossom blight' in connection with anthracnose and inflorescences, not as a separate leaf-only disease entity.

Prevention EN: Do not assign blight-specific prevention until the disease entity is clarified.
Prevention FIL: Draft translation pending expert review: Do not assign blight-specific prevention until the disease entity is clarified.

Cultural management EN: Unavailable pending terminology review.
Cultural management FIL: Draft translation pending expert review: Unavailable pending terminology review.

Sanitation EN: Use general orchard sanitation only as a non-diagnostic precaution and seek expert identification.
Sanitation FIL: Draft translation pending expert review: Use general orchard sanitation only as a non-diagnostic precaution and seek expert identification.

Day 1 EN: Record a clear Day 1 reference photo. Note the number, size, color, and distribution of visible leaf lesions, powdery growth, pustules, browning, wilting, or leaf drop already present.
Day 1 FIL: Kumuha ng malinaw na Day 1 reference photo. Itala ang bilang, laki, kulay, at lokasyon ng nakikitang lesions, powdery growth, pustules, pag-brown, pagkalanta, o paglagas ng dahon na naroon na.
Day 5 EN: Compare with Day 1. Record whether new affected leaves or lesions appeared, whether existing areas expanded, and whether wilting or leaf drop increased. Do not treat visual improvement as confirmation of the disease identity.
Day 5 FIL: Ihambing sa Day 1. Itala kung may bagong apektadong dahon o lesions, kung lumaki ang dating apektadong bahagi, at kung dumami ang pagkalanta o paglagas. Huwag ituring ang pagbuti sa itsura bilang kumpirmasyon ng disease identity.
Day 10 EN: Compare with Days 1 and 5. Record whether spread stopped, remained similar, or increased. Seek expert confirmation if lesions continue expanding, new leaves become affected, or plant vigor declines.
Day 10 FIL: Ihambing sa Day 1 at Day 5. Itala kung huminto, nanatili, o dumami ang pagkalat. Humingi ng expert confirmation kung patuloy lumalaki ang lesions, may bagong apektadong dahon, o humihina ang halaman.

Pesticide: No verified recommendation found.
Reason: No accessible Philippine product label was verified with the complete required use conditions and restrictions. FPA registration-table matches, where present, are recorded only as regulatory leads for reviewer follow-up.

Uncertainty EN: The reviewer must decide whether this project key should map to anthracnose-associated blossom blight, another specific disease, or be rejected.
Uncertainty FIL: Draft translation pending expert review: The reviewer must decide whether this project key should map to anthracnose-associated blossom blight, another specific disease, or be rejected.

### R17. Mango — Mold (fruit)

Evidence status: supported
Awareness only: yes
Sources: PH_BAFS_MANGO_GAP_2025, PH_FPA_REGISTERED_PESTICIDES_2026_07

Symptoms EN: Awareness only. Philippine mango guidance defines sooty mold as a black velvety covering on fruit and leaves associated with honeydew-producing insects. Generic mold should not be treated as a confirmed disease.
Symptoms FIL: Draft translation pending expert review: Awareness only. Philippine mango guidance defines sooty mold as a black velvety covering on fruit and leaves associated with honeydew-producing insects. Generic mold should not be treated as a confirmed disease.

Prevention EN: Manage honeydew-producing insects, bag clean fruit appropriately, and practice pruning.
Prevention FIL: Draft translation pending expert review: Manage honeydew-producing insects, bag clean fruit appropriately, and practice pruning.

Cultural management EN: Use pruning and orchard sanitation.
Cultural management FIL: Draft translation pending expert review: Use pruning and orchard sanitation.

Sanitation EN: Separate visibly mold-affected fruit and clean handling surfaces.
Sanitation FIL: Draft translation pending expert review: Separate visibly mold-affected fruit and clean handling surfaces.

Day 1 EN: Record a clear Day 1 reference photo. Note the number, size, color, depth, softness, cracking, visible fungal growth, and location of affected fruit areas. Keep questionable fruit separate from sound fruit.
Day 1 FIL: Kumuha ng malinaw na Day 1 reference photo. Itala ang bilang, laki, kulay, lalim, lambot, bitak, nakikitang fungal growth, at lokasyon ng apektadong bahagi ng bunga. Ihiwalay ang kahina-hinalang bunga sa maayos na bunga.
Day 5 EN: Compare with Day 1. Record whether new spots appeared, existing spots enlarged or softened, discoloration deepened, or visible mold or rot spread. Remove fruit from the usable lot if deterioration is progressing.
Day 5 FIL: Ihambing sa Day 1. Itala kung may bagong batik, lumaki o lumambot ang dating batik, lumalim ang discoloration, o kumalat ang mold o rot. Alisin sa usable lot ang bunga kung patuloy ang pagkasira.
Day 10 EN: Compare with Days 1 and 5. Record whether deterioration stopped or progressed. Seek expert confirmation when lesions continue spreading, tissue becomes soft or watery, mold increases, or fruit quality is uncertain.
Day 10 FIL: Ihambing sa Day 1 at Day 5. Itala kung huminto o lumala ang pagkasira. Humingi ng expert confirmation kung patuloy kumakalat ang lesions, lumalambot o nagiging watery ang tissue, dumarami ang mold, o hindi tiyak ang kalidad ng bunga.

Pesticide: No verified recommendation found.
Reason: No accessible Philippine product label was verified with the complete required use conditions and restrictions. FPA registration-table matches, where present, are recorded only as regulatory leads for reviewer follow-up.

Uncertainty EN: This is a fruit-only awareness row. Sooty mold is the source-defined condition, but other molds require separate confirmation.
Uncertainty FIL: Draft translation pending expert review: This is a fruit-only awareness row. Sooty mold is the source-defined condition, but other molds require separate confirmation.

### R18. Mango — Rot (fruit)

Evidence status: supported
Awareness only: yes
Sources: PH_BAFS_MANGO_GAP_2025, PH_FPA_REGISTERED_PESTICIDES_2026_07, EXT_UCD_MANGO_POSTHARVEST

Symptoms EN: Awareness only. Philippine mango guidance documents Diplodia/stem-end rot with dark lesions beginning at the pedicel end after harvest and progressing into watery dark-brown to purplish-black decay.
Symptoms FIL: Draft translation pending expert review: Awareness only. Philippine mango guidance documents Diplodia/stem-end rot with dark lesions beginning at the pedicel end after harvest and progressing into watery dark-brown to purplish-black decay.

Prevention EN: Remove dead twigs, bark, and other disease-source debris. Harvest fruit with about 1 to 2 cm of stalk attached as described in the BAFS source.
Prevention FIL: Draft translation pending expert review: Remove dead twigs, bark, and other disease-source debris. Harvest fruit with about 1 to 2 cm of stalk attached as described in the BAFS source.

Cultural management EN: Use careful harvest and post-harvest handling to minimize injuries.
Cultural management FIL: Draft translation pending expert review: Use careful harvest and post-harvest handling to minimize injuries.

Sanitation EN: Separate rotting fruit from sound fruit and remove disease-source orchard debris.
Sanitation FIL: Draft translation pending expert review: Separate rotting fruit from sound fruit and remove disease-source orchard debris.

Day 1 EN: Record a clear Day 1 reference photo. Note the number, size, color, depth, softness, cracking, visible fungal growth, and location of affected fruit areas. Keep questionable fruit separate from sound fruit.
Day 1 FIL: Kumuha ng malinaw na Day 1 reference photo. Itala ang bilang, laki, kulay, lalim, lambot, bitak, nakikitang fungal growth, at lokasyon ng apektadong bahagi ng bunga. Ihiwalay ang kahina-hinalang bunga sa maayos na bunga.
Day 5 EN: Compare with Day 1. Record whether new spots appeared, existing spots enlarged or softened, discoloration deepened, or visible mold or rot spread. Remove fruit from the usable lot if deterioration is progressing.
Day 5 FIL: Ihambing sa Day 1. Itala kung may bagong batik, lumaki o lumambot ang dating batik, lumalim ang discoloration, o kumalat ang mold o rot. Alisin sa usable lot ang bunga kung patuloy ang pagkasira.
Day 10 EN: Compare with Days 1 and 5. Record whether deterioration stopped or progressed. Seek expert confirmation when lesions continue spreading, tissue becomes soft or watery, mold increases, or fruit quality is uncertain.
Day 10 FIL: Ihambing sa Day 1 at Day 5. Itala kung huminto o lumala ang pagkasira. Humingi ng expert confirmation kung patuloy kumakalat ang lesions, lumalambot o nagiging watery ang tissue, dumarami ang mold, o hindi tiyak ang kalidad ng bunga.

Pesticide: No verified recommendation found.
Reason: No accessible Philippine product label was verified with the complete required use conditions and restrictions. FPA registration-table matches, where present, are recorded only as regulatory leads for reviewer follow-up.

Uncertainty EN: Display as rot awareness unless the specific stem-end-rot condition is confirmed.
Uncertainty FIL: Draft translation pending expert review: Display as rot awareness unless the specific stem-end-rot condition is confirmed.

## FPA regulatory leads that are not treatment recommendations

These records preserve exact FPA registry information for expert follow-up. They are not approved treatment rows because a complete Philippine product label with all required restrictions was not obtained.

| Fruit | Condition | Product | FPA registration | Registry rate | Missing verification |
|---|---|---|---|---|---|
| Papaya | Powdery mildew | BENOLATE 50 WP | 457-167-2551 | 1-2 Tbsp/16 L water | Complete label, application method, interval, maximum applications, full PPE, mixing/compatibility and complete restrictions |
| Banana | Anthracnose | IVATOP 550 SC | 088-107-4167 | 1 mL/L of water | Complete label, application method, interval, maximum applications, full PPE, mixing/compatibility and complete restrictions |
| Banana | Rust | LEADER 500 SC | 603-118-5342 | 2 L/ha | Complete label, application method, interval, maximum applications, full PPE, mixing/compatibility and complete restrictions |
| Banana | Mold / Rot awareness | RAZPRO 450 EW | 667-300-5994 | 32 mL/16 L water | Complete label, application method, interval, maximum applications, full PPE, mixing/compatibility and complete restrictions |
| Mango | Anthracnose | STK REGEV | 527-480-4399 | 100-125 mL product/200 L water | Complete label, application method, interval, maximum applications, full PPE, mixing/compatibility and complete restrictions |
| Mango | Scab | AGNEWTEK DIFENOXTROBIN 325 SC | 762-486-7528 | 150-200 mL/200 L drum | Complete label, application method, interval, maximum applications, full PPE, mixing/compatibility and complete restrictions |
| Mango | Powdery mildew | BENOMEX 50 WP | 702-167-5617 | 1-2 Tbsp/16 L water | Complete label, application method, interval, maximum applications, full PPE, mixing/compatibility and complete restrictions |

## Source registry

### PH_BAFS_MANGO_GAP_2025
- Authority: Department of Agriculture, Bureau of Agriculture and Fisheries Standards
- Title: Explanatory Manual for Good Agricultural Practices for Mango
- URL: https://bafs.da.gov.ph/wp-content/uploads/2025/05/2025_EM-GAP-Mango_compressed.pdf
- Page/section: Annex II, PDF pp. 119-121; printed pp. 110-112
- Scope: Philippines; mango anthracnose, scab, sooty mold, Diplodia/stem-end rot, cultural and sanitation management

### PH_BPI_PAPAYA_GUIDE
- Authority: Department of Agriculture, Bureau of Plant Industry
- Title: Papaya Production Guide
- URL: https://library.buplant.da.gov.ph/images/1641884692Papaya%20%20Production%20Guide.pdf
- Page/section: Important Insect Pests and Diseases; Phytophthora Rot and Brown Spot sections
- Scope: Philippines; papaya disease symptoms and non-chemical controls

### PH_PCAARRD_BANANA_HIYEAST
- Authority: DOST-PCAARRD
- Title: BioCon agent HiYEAST controls postharvest diseases in crops
- URL: https://www.pcaarrd.dost.gov.ph/index.php/quick-information-dispatch-qid-articles/biocon-agent-hiyeast-controls-postharvest-diseases-in-crops
- Page/section: Banana crown rot and anthracnose; experimental HiYEAST discussion
- Scope: Philippines; banana post-harvest anthracnose and crown rot. Experimental product is not commercially available.

### PH_UPLB_PAPAYA_ANTHRACNOSE
- Authority: UPLB-linked Philippine research indexed by FAO AGRIS
- Title: Identification and characterization of Colletotrichum brevisporum and C. truncatum causing papaya anthracnose in the Philippines
- URL: https://agris.fao.org/search/en/providers/122535/records/65df0a077c7033e84beca4fe
- Page/section: Abstract
- Scope: Philippines; confirms papaya anthracnose and fruit lesion characteristics

### PH_PCAARRD_MANGO_PEST_DISEASE
- Authority: DOST-PCAARRD
- Title: Pinakamahusay na pamamaraan ng pangangasiwa sa mangga para sa mas mataas na kalidad at produksyon, isinusulong ng PCAARRD
- URL: https://www.pcaarrd.dost.gov.ph/index.php/quick-information-dispatch-qid-articles/pinakamahusay-na-pamamaraan-ng-pangangasiwa-sa-mangga-para-sa-mas-mataas-na-kalidad-at-produksyon-isinusulong-ng-pcaarrd
- Page/section: Disease discussion
- Scope: Philippines; notes anthracnose, blossom blight, scab and stem-end rot in mango

### PH_FPA_REGISTERED_PESTICIDES_2026_07
- Authority: Philippine Fertilizer and Pesticide Authority
- Title: Registered pesticide products as of July 31, 2026
- URL: https://mirrored.fpa-gov.ph/wp-content/uploads/2026/08/UPDATED-LIST-OF-REGISTERED-PRODUCTS-As-of-July-31-2026-PMID.pdf
- Page/section: Relevant entries across PDF pp. 55, 88, 210, 241, 311, 337, 383, 401, 483
- Scope: Official FPA registration evidence including product, crop, target, rate, PHI/re-entry where listed. Not treated as a complete product label.

### PH_FPA_REGISTRATION_RULE
- Authority: Philippine Fertilizer and Pesticide Authority
- Title: FPA Advisory No. 2024-001
- URL: https://fpa.da.gov.ph/advisory-1/
- Page/section: Registration warning and PD 1144 discussion
- Scope: Philippine regulatory requirement that pesticides be duly registered and used according to registered conditions

### EXT_UH_BANANA_ROTS_PD54
- Authority: University of Hawai‘i CTAHR
- Title: Postharvest Rots of Banana, Plant Disease PD-54
- URL: https://www.ctahr.hawaii.edu/oc/freepubs/pdf/PD-54.pdf
- Page/section: Primary symptoms and integrated management practices
- Scope: Non-Philippine extension support for banana anthracnose and crown rot; requires Philippine expert confirmation

### EXT_UOG_BANANA_RUST
- Authority: University of Guam
- Title: Diseases of cultivated crops in Pacific Island countries
- URL: https://www.uog.edu/_resources/files/extension/publications/Pacific_Islands_Diseases_1997.pdf
- Page/section: Banana, Uredo musae, Rust
- Scope: Non-Philippine Pacific extension support for banana leaf rust symptoms; requires Philippine expert confirmation

### EXT_UF_PAPAYA_DISEASES
- Authority: University of Florida IFAS Extension
- Title: Papaya Growing in the Florida Home Landscape
- URL: https://ask.ifas.ufl.edu/publication/MG054
- Page/section: Diseases: anthracnose, powdery mildew, Phytophthora blight
- Scope: Non-Philippine extension support; requires Philippine expert confirmation

### EXT_UF_MANGO_DISEASES
- Authority: University of Florida IFAS Extension
- Title: Mango Growing in the Florida Home Landscape
- URL: https://edis.ifas.ufl.edu/publication/mg216
- Page/section: Disease section: anthracnose, powdery mildew, scab
- Scope: Non-Philippine extension support for mango powdery mildew symptoms and cultural context; requires Philippine expert confirmation

### EXT_UCD_MANGO_POSTHARVEST
- Authority: UC Davis Postharvest Research and Extension Center
- Title: Mango
- URL: https://postharvest.ucdavis.edu/produce-facts-sheets/mango
- Page/section: Pathological disorders and control strategies
- Scope: Non-Philippine post-harvest supporting evidence; requires Philippine expert confirmation
