// src/test/setupHistoryLog.ts
import { resetHistoryLog } from '../utils/historyLog';
import { beforeEach } from 'vitest';

beforeEach(() => {
  resetHistoryLog();
});