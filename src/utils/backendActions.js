import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebaseConfig';
import {
  sanitizeColorInput,
  sanitizeEmailInput,
  sanitizeOptionalTextInput,
  sanitizeTextInput,
} from './sanitize';

function callable(name) {
  return httpsCallable(functions, name);
}

export async function saveTask(payload) {
  const saveTaskCall = callable('saveTask');
  const response = await saveTaskCall({
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
  const deleteTaskCall = callable('deleteTask');
  const response = await deleteTaskCall({ taskId });
  return response.data;
}

export async function toggleTaskCompletion(taskId) {
  const toggleTaskCompletionCall = callable('toggleTaskCompletion');
  const response = await toggleTaskCompletionCall({ taskId });
  return response.data;
}

export async function saveAnnouncement(payload) {
  const saveAnnouncementCall = callable('saveAnnouncement');
  const response = await saveAnnouncementCall({
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
  const deleteAnnouncementCall = callable('deleteAnnouncement');
  const response = await deleteAnnouncementCall({ announcementId });
  return response.data;
}

export async function createFreedomWallPost(payload) {
  const createFreedomWallPostCall = callable('createFreedomWallPost');
  const response = await createFreedomWallPostCall({
    content: sanitizeTextInput(payload.content, { maxLength: 500, multiline: true }),
    persona: sanitizeTextInput(payload.persona, { maxLength: 32 }),
    personaColor: sanitizeColorInput(payload.personaColor, '#2A9D8F'),
    noteColor: sanitizeColorInput(payload.noteColor, '#FFFACD'),
  });
  return response.data;
}

export async function toggleFreedomWallLike(postId) {
  const toggleFreedomWallLikeCall = callable('toggleFreedomWallLike');
  const response = await toggleFreedomWallLikeCall({ postId });
  return response.data;
}

export async function submitReport(payload) {
  const submitReportCall = callable('submitReport');
  const response = await submitReportCall({
    postId: payload.postId,
    reason: payload.reason,
    description: sanitizeOptionalTextInput(payload.description, {
      maxLength: 1000,
      multiline: true,
    }),
  });
  return response.data;
}

export async function updateReportStatus(reportId, status) {
  const updateReportStatusCall = callable('updateReportStatus');
  const response = await updateReportStatusCall({ reportId, status });
  return response.data;
}

export async function deleteReport(reportId) {
  const deleteReportCall = callable('deleteReport');
  const response = await deleteReportCall({ reportId });
  return response.data;
}

export async function updateUserRole(userId, role) {
  const updateUserRoleCall = callable('updateUserRole');
  const response = await updateUserRoleCall({ userId, role });
  return response.data;
}

export async function deleteFreedomWallPost(postId) {
  const deleteFreedomWallPostCall = callable('deleteFreedomWallPost');
  const response = await deleteFreedomWallPostCall({ postId });
  return response.data;
}

export { sanitizeEmailInput };
