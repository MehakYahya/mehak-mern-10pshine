// frontend/src/utils/api.js
export const apiBase = process.env.REACT_APP_API_BASE || 'http://localhost:5000';

export function authHeaders() {
  const token = localStorage.getItem("token");
  const cleanToken = token && token !== 'undefined' && token !== 'null' ? token : null;
  return cleanToken ? { Authorization: `Bearer ${cleanToken}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
}
