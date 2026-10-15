export const getApiUrl = () => {
  const url = import.meta.env.VITE_API_URL;
  if (url && url.trim() !== '') {
    return url.replace(/\/$/, '');
  }
  return import.meta.env.PROD ? '' : 'http://localhost:3005';
};

export default getApiUrl;
