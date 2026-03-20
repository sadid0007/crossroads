export interface BandMapping {
  [rawScore: string]: number;
}

// Default IELTS Academic band mapping for Listening (out of 40)
export const DEFAULT_LISTENING_BAND_MAP: BandMapping = {
  "39": 9.0, "40": 9.0,
  "37": 8.5, "38": 8.5,
  "35": 8.0, "36": 8.0,
  "33": 7.5, "34": 7.5,
  "30": 7.0, "31": 7.0, "32": 7.0,
  "27": 6.5, "28": 6.5, "29": 6.5,
  "23": 6.0, "24": 6.0, "25": 6.0, "26": 6.0,
  "20": 5.5, "21": 5.5, "22": 5.5,
  "16": 5.0, "17": 5.0, "18": 5.0, "19": 5.0,
  "13": 4.5, "14": 4.5, "15": 4.5,
  "10": 4.0, "11": 4.0, "12": 4.0,
  "6": 3.5, "7": 3.5, "8": 3.5, "9": 3.5,
  "4": 3.0, "5": 3.0,
  "2": 2.5, "3": 2.5,
  "1": 2.0,
  "0": 0,
};

// Default IELTS Academic band mapping for Reading (out of 40)
export const DEFAULT_READING_BAND_MAP: BandMapping = {
  "39": 9.0, "40": 9.0,
  "37": 8.5, "38": 8.5,
  "35": 8.0, "36": 8.0,
  "33": 7.5, "34": 7.5,
  "30": 7.0, "31": 7.0, "32": 7.0,
  "27": 6.5, "28": 6.5, "29": 6.5,
  "23": 6.0, "24": 6.0, "25": 6.0, "26": 6.0,
  "19": 5.5, "20": 5.5, "21": 5.5, "22": 5.5,
  "15": 5.0, "16": 5.0, "17": 5.0, "18": 5.0,
  "13": 4.5, "14": 4.5,
  "10": 4.0, "11": 4.0, "12": 4.0,
  "8": 3.5, "9": 3.5,
  "6": 3.0, "7": 3.0,
  "4": 2.5, "5": 2.5,
  "3": 2.0,
  "2": 1.5, "1": 1.0,
  "0": 0,
};

export function getRawToBand(rawScore: number, bandMap: BandMapping): number {
  // Find the closest raw score in the band map
  const score = String(rawScore);
  if (bandMap[score] !== undefined) return bandMap[score];

  // Find the nearest lower score
  const scores = Object.keys(bandMap).map(Number).sort((a, b) => b - a);
  for (const s of scores) {
    if (rawScore >= s) return bandMap[String(s)];
  }
  return 0;
}

export function calculateOverallBand(sectionBands: number[]): number {
  const avg = sectionBands.reduce((a, b) => a + b, 0) / sectionBands.length;
  // IELTS rounding: round to nearest 0.5
  return Math.round(avg * 2) / 2;
}

export function normalizeAnswer(answer: string, rules?: { caseSensitive?: boolean; trimWhitespace?: boolean; stripArticles?: boolean }): string {
  let normalized = answer;
  if (!rules?.caseSensitive) normalized = normalized.toLowerCase();
  if (rules?.trimWhitespace !== false) normalized = normalized.trim().replace(/\s+/g, " ");
  if (rules?.stripArticles) normalized = normalized.replace(/^(a|an|the)\s+/i, "");
  return normalized;
}

export function checkAnswer(
  studentAnswer: string | string[],
  correctAnswer: string | string[],
  variants?: string[],
  rules?: { caseSensitive?: boolean; trimWhitespace?: boolean; stripArticles?: boolean; spellingMode?: string }
): boolean {
  const normalize = (s: string) => normalizeAnswer(s, rules);

  if (Array.isArray(studentAnswer) && Array.isArray(correctAnswer)) {
    const normalizedStudent = studentAnswer.map(normalize).sort();
    const normalizedCorrect = correctAnswer.map(normalize).sort();
    return JSON.stringify(normalizedStudent) === JSON.stringify(normalizedCorrect);
  }

  const studentStr = normalize(String(studentAnswer));
  const allAccepted = [correctAnswer, ...(variants || [])].flat().map(a => normalize(String(a)));

  return allAccepted.includes(studentStr);
}
