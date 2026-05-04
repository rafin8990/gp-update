import { jest } from '@jest/globals';

const mClient = {
  query: jest.fn(),
  release: jest.fn(),
  connect: jest.fn().mockReturnThis(),
};

export const Pool = jest.fn(() => ({
  connect: jest.fn(() => mClient),
  query: mClient.query,
   on: jest.fn(),
}));


(Pool as any).mClient = mClient;
export default { Pool };
