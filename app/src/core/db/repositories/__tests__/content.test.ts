import { seededDb } from '../../testing/scanFixtures';
import { listAllDiseasesByFruit, listDiseasesByFruit, listRemediesByDisease } from '../content';

describe('content repository', () => {
  it('lists diseases and remedies', () => {
    const driver = seededDb();
    
    driver.exec(`INSERT INTO disease (key, fruit_key, name_en, name_fil) VALUES ('d1', 'banana', 'D1', 'D1')`);
    driver.exec(`INSERT INTO remedy (key, disease_key, name_en, name_fil, is_prevention) VALUES ('r1', 'd1', 'R1', 'R1', 0)`);

    const diseases = listDiseasesByFruit(driver, 'banana');
    expect(diseases).toHaveLength(1);
    expect(diseases[0].key).toBe('d1');

    const remedies = listRemediesByDisease(driver, 'd1');
    expect(remedies).toHaveLength(1);
    expect(remedies[0].key).toBe('r1');
    expect(remedies[0].isPrevention).toBe(false);
  });

  it('keeps disease and remedy citations reachable in the fruit-first view', () => {
    const driver = seededDb();
    driver.exec(`INSERT INTO disease (key, fruit_key, name_en, name_fil, source_id)
      VALUES ('d1', 'banana', 'Anthracnose', 'Antraknos', 'pcaarrd_banana')`);
    driver.exec(`INSERT INTO remedy (key, disease_key, name_en, name_fil, is_prevention, source_id)
      VALUES ('r1', 'd1', 'Sanitation', 'Kalinisan', 1, 'pcaarrd_banana')`);

    const disease = listAllDiseasesByFruit(driver).banana[0];
    expect(disease.source?.citation).toBeTruthy();
    expect(disease.remedies[0].source?.citation).toBeTruthy();
  });
});
