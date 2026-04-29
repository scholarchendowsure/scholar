// Database exports
// This module provides mock database functionality

import { mockDb } from './mock-db';

export const db = mockDb;

// Re-export schema types
export const schema = {
  mcpServices: {
    id: 'id',
    tableName: 'mcp_services',
    columns: ['id', 'name', 'type', 'endpoint', 'config', 'apiKey', 'status', 'createdAt', 'updatedAt']
  },
  users: {
    id: 'id',
    tableName: 'users',
    columns: ['id', 'sequence', 'name', 'username', 'email', 'password', 'department', 'role', 'status', 'lastLoginTime', 'createdAt', 'updatedAt']
  },
  cases: {
    id: 'id',
    tableName: 'cases',
    columns: ['id', 'caseId', 'caseType', 'customerName', 'idNumber', 'phone', 'address', 'caseAmount', 'overdueDays', 'status', 'assigneeId', 'assigneeName', 'priority', 'riskLevel', 'remarks', 'followUpCount', 'lastFollowUpDate', 'createdAt', 'updatedAt', 'closedAt', 'closedBy', 'closureType', 'actualRepaymentAmount']
  }
};

export { mockDb };
