// Mock Database for MCP Services
// This provides a mock implementation for database operations

interface DbResult {
  select: () => {
    from: (table: { id: string; tableName: string; columns: string[] }) => {
      where: (condition: any) => {
        limit: (n: number) => Promise<any[]>;
      };
      limit: (n: number) => Promise<any[]>;
    };
  };
  update: (table: any) => {
    set: (data: any) => {
      where: (condition: any) => Promise<{ rowCount: number }>;
    };
  };
  insert: (table: any) => {
    values: (data: any) => Promise<{ rowCount: number }>;
  };
  delete: (table: any) => {
    where: (condition: any) => Promise<{ rowCount: number }>;
  };
}

// Mock implementation
export const mockDb: DbResult = {
  select: () => ({
    from: (table: { id: string; tableName: string; columns: string[] }) => ({
      where: (condition: any) => ({
        limit: async (n: number) => {
          return [];
        }
      }),
      limit: async (n: number) => {
        return [];
      }
    })
  }),
  update: (table: any) => ({
    set: (data: any) => ({
      where: async (condition: any) => {
        return { rowCount: 0 };
      }
    })
  }),
  insert: (table: any) => ({
    values: async (data: any) => {
      return { rowCount: 1 };
    }
  }),
  delete: (table: any) => ({
    where: async (condition: any) => {
      return { rowCount: 0 };
    }
  })
};
