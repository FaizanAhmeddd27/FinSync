const API_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  'http://localhost:5000';

export const env = {
  API_URL,
  VAPI_PUBLIC_KEY: import.meta.env.VITE_VAPI_PUBLIC_KEY,
  VAPI_ASSISTANT_ID: import.meta.env.VITE_VAPI_ASSISTANT_ID,
};
