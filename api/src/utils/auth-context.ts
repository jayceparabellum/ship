import type { Request } from 'express';

export interface AuthContext {
  userId: string;
  workspaceId: string;
}

export function getAuthContext(req: Request): AuthContext {
  if (!req.userId || !req.workspaceId) {
    throw new Error('Authenticated request missing auth context');
  }

  return {
    userId: req.userId,
    workspaceId: req.workspaceId,
  };
}

export function getUserId(req: Request): string {
  if (!req.userId) {
    throw new Error('Authenticated request missing user context');
  }

  return req.userId;
}

export function getWorkspaceId(req: Request): string {
  if (!req.workspaceId) {
    throw new Error('Authenticated request missing workspace context');
  }

  return req.workspaceId;
}
