import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { Message, UploadedFile } from "../types";

// Initialize Gemini Client
// @ts-ignore - Process env is injected by the runtime
const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// Configuration for the model
const MODEL_NAME = 'gemini-2.5-flash';

const SYSTEM_INSTRUCTION = `You are a specialized document analysis assistant. 
Your task is to answer user questions strictly based on the provided PDF documents.
1. If the answer is found in the documents, provide a clear and concise response.
2. If the answer is partially found, mention what is available and what is missing.
3. If the answer is not found in the documents, explicitly state that the information is not contained in the provided text.
4. Do not use outside knowledge to answer questions unless specifically asked to explain a general concept found in the text.
5. Format your responses using clean Markdown.`;

let chatSession: Chat | null = null;

export const initializeChat = (): void => {
  chatSession = ai.chats.create({
    model: MODEL_NAME,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
    },
  });
};

export const generateSummary = async (files: UploadedFile[]): Promise<string> => {
  const fileParts = files.map(file => {
    const base64Data = file.data.split(',')[1] || file.data;
    return {
      inlineData: {
        data: base64Data,
        mimeType: file.type,
      }
    };
  });

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          ...fileParts,
          { text: "Please provide a concise and structured summary of all these documents. Highlight key takeaways, main topics, and any critical findings. Use bullet points where appropriate." }
        ]
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION
      }
    });

    return response.text || "I was unable to generate a summary for these documents.";
  } catch (error) {
    console.error("Summary generation error:", error);
    throw error;
  }
};

export const sendMessageStream = async (
  text: string,
  files?: UploadedFile[] | null,
  onChunk?: (text: string) => void
): Promise<string> => {
  if (!chatSession) {
    initializeChat();
  }

  if (!chatSession) {
    throw new Error("Failed to initialize chat session");
  }

  let fullResponse = "";
  
  try {
    let result;

    // If it's the very first message with files, we attach them
    if (files && files.length > 0) {
      
      const fileParts = files.map(file => {
        // Clean base64 data (remove data URL prefix if present)
        const base64Data = file.data.split(',')[1] || file.data;
        return {
          inlineData: {
            data: base64Data,
            mimeType: file.type,
          }
        };
      });

      result = await chatSession.sendMessageStream({
        message: {
          role: 'user',
          parts: [
            ...fileParts,
            {
              text: text,
            },
          ],
        },
      });
    } else {
      // Subsequent messages are text only
      result = await chatSession.sendMessageStream({
        message: {
          role: 'user',
          parts: [{ text }],
        },
      });
    }

    for await (const chunk of result) {
      const chunkText = (chunk as GenerateContentResponse).text;
      if (chunkText) {
        fullResponse += chunkText;
        if (onChunk) {
          onChunk(fullResponse);
        }
      }
    }

    return fullResponse;

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};