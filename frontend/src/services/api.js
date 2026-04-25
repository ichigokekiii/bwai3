import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api"
});

export async function getUser(userId) {
  const { data } = await api.get(`/users/${userId}`);
  return data;
}

export async function createUser(payload) {
  const { data } = await api.post("/users", payload);
  return data;
}

export async function updateUser(userId, payload) {
  const { data } = await api.put(`/users/${userId}`, payload);
  return data;
}

export async function getUserGroups(userId) {
  const { data } = await api.get(`/groups/user/${userId}`);
  return data;
}

export async function createGroup(payload) {
  const { data } = await api.post("/groups", payload);
  return data;
}

export async function getGroupMembers(groupId) {
  const { data } = await api.get(`/groups/${groupId}/members`);
  return data;
}

export async function addGroupMember(groupId, payload) {
  const { data } = await api.post(`/groups/${groupId}/members`, payload);
  return data;
}

export async function deleteGroupMember(groupId, memberId) {
  const { data } = await api.delete(`/groups/${groupId}/members/${memberId}`);
  return data;
}

export async function getUserAnnouncements(userId) {
  const { data } = await api.get(`/announcements/user/${userId}`);
  return data;
}

export async function analyzeAnnouncement(payload) {
  const { data } = await api.post("/ai/analyze-announcement", payload);
  return data;
}

export async function extractImageText(payload) {
  const { data } = await api.post("/ai/extract-image-text", payload);
  return data;
}

export async function startAlert(payload) {
  const { data } = await api.post("/alerts/start", payload);
  return data;
}

export async function stopAlert(alertId) {
  const { data } = await api.post(`/alerts/${alertId}/stop`);
  return data;
}

export async function acknowledgeAlert(alertId, recipientEmail) {
  const { data } = await api.post(`/alerts/${alertId}/acknowledge`, { recipientEmail });
  return data;
}

export async function getAlert(alertId) {
  const { data } = await api.get(`/alerts/${alertId}`);
  return data;
}

export async function getUserAlerts(userId) {
  const { data } = await api.get(`/alerts/user/${userId}`);
  return data;
}

export async function createVote(payload) {
  const { data } = await api.post("/votes", payload);
  return data;
}

export async function getVotesByAnnouncement(announcementId) {
  const { data } = await api.get(`/votes/announcement/${announcementId}`);
  return data;
}

export default api;
