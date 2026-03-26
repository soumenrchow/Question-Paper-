import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface Question {
  type: 'MCQ' | 'Short' | 'Long';
  question: string;
  options?: string[];
  answer: string;
  marks: number;
}

export interface QuestionPaper {
  title: string;
  totalMarks: number;
  timeMinutes: number;
  difficulty: string;
  questions: Question[];
}

export async function generateQuestionPaper(
  fileData: { data: string; mimeType: string }[],
  marks: number,
  difficulty: 'Simple' | 'Medium' | 'Complex'
): Promise<QuestionPaper> {
  const timeMap: Record<number, number> = {
    25: 45,
    50: 90,
    80: 180,
  };

  const prompt = `
    You are an expert educator. Based on the provided chapter content, generate a professional question paper.
    
    Constraints:
    - Total Marks: ${marks}
    - Difficulty Level: ${difficulty}
    - Question Distribution (by marks):
      - 20% Multiple Choice Questions (MCQs) - 1 mark each.
      - 30% Short Answer Type Questions - 2-3 marks each.
      - 40% Long Answer Type Questions (Skill-Based) - 5-10 marks each.
      - 10% Objective/Very Short Questions - 1 mark each.
    - Focus: Skill-based, analysis, and application-oriented questions rather than rote learning.
    - Output Format: JSON only.
    
    JSON Schema:
    {
      "title": "Question Paper Title",
      "questions": [
        {
          "type": "MCQ",
          "question": "...",
          "options": ["A", "B", "C", "D"],
          "answer": "...",
          "marks": 1
        },
        {
          "type": "Short",
          "question": "...",
          "answer": "...",
          "marks": 3
        },
        {
          "type": "Long",
          "question": "...",
          "answer": "...",
          "marks": 5
        }
      ]
    }
  `;

  const model = "gemini-3-flash-preview";
  const contents = [
    ...fileData.map(f => ({
      inlineData: {
        data: f.data,
        mimeType: f.mimeType
      }
    })),
    { text: prompt }
  ];

  const response: GenerateContentResponse = await ai.models.generateContent({
    model,
    contents: { parts: contents },
    config: {
      responseMimeType: "application/json"
    }
  });

  const result = JSON.parse(response.text || "{}");
  
  return {
    ...result,
    totalMarks: marks,
    timeMinutes: timeMap[marks] || 60,
    difficulty
  };
}
