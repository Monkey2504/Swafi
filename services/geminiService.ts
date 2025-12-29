
import { GoogleGenAI, Type } from "@google/genai";
import { SncfPlanning } from "../types";

export const parsePlanning = async (
  fileData: string | null, 
  textInput: string | null, 
  mimeType: string = 'application/pdf'
): Promise<SncfPlanning> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const systemInstruction = `Tu es l'Expert Principal de l'Ingénierie des Roulements de la SNCB (Belgique). Ta mission est d'extraire les données de planning avec une rigueur absolue conforme aux standards Rail-Belgique.

PROTOCOLE D'EXTRACTION B-RAIL :
1. ANALYSE MINUTIEUSE : Chaque cellule contient 3 lignes (Début, Fin, Code). Les minutes SNCB/SNCB sont critiques (ex: 05:05 n'est PAS 05:15).
2. RÈGLE DES 24H+ : Les heures dépassant 24:00 (travail de nuit) DOIVENT être converties au format du lendemain (ex: 25:10 devient 01:10).
3. CODES MÉTIERS BELGES :
   - HSBR, CW, RW, RT, RH, RV/ = Statuts de repos ou congés spécifiques. Pour ces cas, debut et fin sont NULL.
   - FL-A, FL-B... = Séries de roulement (ex: Petits matins).
   - RES = Réserve stratégique.
4. INTÉGRITÉ DU CYCLE : Un roulement SNCB complet s'étend généralement sur 31 semaines. Tu dois impérativement extraire chaque semaine de 1 à 31, sans omission.
5. LOCALISATION : Identifie la Série et la Période (ex: Z SUP 0) sans altération.

SORTIE : JSON pur uniquement.`;

  const daySchema = {
    type: Type.OBJECT,
    properties: {
      debut: { type: Type.STRING, description: "HH:mm ou null", nullable: true },
      fin: { type: Type.STRING, description: "HH:mm (converti si >24h) ou null", nullable: true },
      code: { type: Type.STRING, description: "Code service ou repos", nullable: true },
    },
    required: ["debut", "fin", "code"]
  };

  const semaineSchema = {
    type: Type.OBJECT,
    properties: {
      semaine: { type: Type.INTEGER },
      lundi: daySchema,
      mardi: daySchema,
      mercredi: daySchema,
      jeudi: daySchema,
      vendredi: daySchema,
      samedi: daySchema,
      dimanche: daySchema,
    },
    required: ["semaine", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"]
  };

  try {
    const parts: any[] = [];
    if (fileData) {
      parts.push({
        inlineData: {
          mimeType: mimeType || 'application/pdf',
          data: fileData.split(',')[1]
        }
      });
    }
    if (textInput) {
      parts.push({ text: `Source additionnelle B-Rail : ${textInput}` });
    }
    
    parts.push({ text: "Analyse ce roulement SNCB et extrais les 31 semaines avec une précision totale sur les horaires et les codes." });

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: { parts },
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 32768 },
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            serie: { type: Type.STRING },
            periode: { type: Type.STRING },
            semaines: {
              type: Type.ARRAY,
              items: semaineSchema
            }
          },
          required: ["serie", "periode", "semaines"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("Réponse vide du moteur Rail-AI.");
    return JSON.parse(text) as SncfPlanning;
  } catch (error: any) {
    console.error("Gemini B-Rail Error:", error);
    throw new Error("L'extraction Rail-AI a échoué. Veuillez vérifier la netteté du document SNCB.");
  }
};
