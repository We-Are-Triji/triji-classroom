import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
import {
  sanitizeColorInput,
  sanitizeEmailInput,
  sanitizeOptionalTextInput,
  sanitizeTextInput,
} from './security';

function callable(name) {
  return httpsCallable(functions, name);
}

export async function saveTask(payload) {
  const response = await callable('saveTask')({
    taskId: payload.taskId || null,
    title: sanitizeTextInput(payload.title, { maxLength: 120 }),
    details: sanitizeOptionalTextInput(payload.details, {
      maxLength: 2000,
      multiline: true,
    }),
    subjectId: sanitizeTextInput(payload.subjectId, { maxLength: 120 }),
    subjectName: sanitizeTextInput(payload.subjectName, { maxLength: 120 }),
    subjectCode: sanitizeTextInput(payload.subjectCode, { maxLength: 24 }).toUpperCase(),
    deadline: payload.deadline,
  });

  return response.data;
}

export async function deleteTask(taskId) {
  const response = await callable('deleteTask')({ taskId });
  return response.data;
}

export async function saveAnnouncement(payload) {
  const response = await callable('saveAnnouncement')({
    announcementId: payload.announcementId || null,
    title: sanitizeTextInput(payload.title, { maxLength: 120 }),
    content: sanitizeTextInput(payload.content, {
      maxLength: 4000,
      multiline: true,
    }),
    type: payload.type,
    expiresAt: payload.expiresAt || null,
  });

  return response.data;
}

export async function deleteAnnouncement(announcementId) {
  const response = await callable('deleteAnnouncement')({ announcementId });
  return response.data;
}

export async function updateReportStatus(reportId, status) {
  const response = await callable('updateReportStatus')({ reportId, status });
  return response.data;
}

export async function deleteReport(reportId) {
  const response = await callable('deleteReport')({ reportId });
  return response.data;
}

export async function updateUserRole(userId, role) {
  const response = await callable('updateUserRole')({ userId, role });
  return response.data;
}

export async function deleteFreedomWallPost(postId) {
  const response = await callable('deleteFreedomWallPost')({ postId });
  return response.data;
}

export async function createFreedomWallPost(payload) {
  const response = await callable('createFreedomWallPost')({
    content: sanitizeTextInput(payload.content, { maxLength: 500, multiline: true }),
    persona: sanitizeTextInput(payload.persona, { maxLength: 32 }),
    personaColor: sanitizeColorInput(payload.personaColor, '#2A9D8F'),
    noteColor: sanitizeColorInput(payload.noteColor, '#FFFACD'),
  });
  return response.data;
}

export { sanitizeEmailInput };
