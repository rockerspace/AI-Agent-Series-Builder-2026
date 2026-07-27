// Dynamic runtime evaluation to completely bypass static syntax parsing errors (like import.meta) in Jest/CommonJS test runner environments.
const getMetaEnv = () => {
  try {
    return (new Function('return import.meta.env'))();
  } catch {
    return {};
  }
};

export const API_URL = getMetaEnv().VITE_API_URL || 'http://127.0.0.1:8000';
