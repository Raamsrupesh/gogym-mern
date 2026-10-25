import path from 'node:path';
import { fileURLToPath } from 'node:url';

const serverDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const transformationUploadDirectory = path.join(serverDirectory, 'uploads', 'transformations');
export const memberDocumentUploadDirectory = path.join(serverDirectory, 'uploads', 'member-documents');
