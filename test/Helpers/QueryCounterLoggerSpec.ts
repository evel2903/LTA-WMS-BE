import { QueryCounterLogger } from '@test/Helpers/QueryCounterLogger';

describe('QueryCounterLogger', () => {
  it('separates data queries from transaction control without retaining parameters', () => {
    const logger = new QueryCounterLogger();
    const captureId = logger.StartCapture();

    logger.logQuery('START TRANSACTION');
    logger.logQuery('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
    logger.logQuery(' /* rh_06_probe */ SELECT * FROM roles WHERE id = $1', ['do-not-retain']);
    logger.logQuery('UPDATE roles SET status = $1 WHERE id = $2', ['ACTIVE', 'do-not-retain']);
    logger.logQuery('COMMIT');
    logger.logQuerySlow(12, 'SELECT pg_sleep(0)');
    logger.logQueryError('forced', 'SELECT 1', ['do-not-retain']);

    const capture = logger.StopCapture(captureId);

    expect(capture).toEqual({
      DataQueryCount: 2,
      SelectQueryCount: 1,
      TransactionControlCount: 3,
      ErrorCount: 1,
      SlowQueryCount: 1,
    });
    expect(JSON.stringify(capture)).not.toContain('do-not-retain');
  });

  it('resets between captures and rejects stale or overlapping ownership', () => {
    const logger = new QueryCounterLogger();
    const first = logger.StartCapture();
    logger.logQuery('SELECT 1');

    expect(() => logger.StartCapture()).toThrow('A query capture is already active');
    expect(logger.StopCapture(first).DataQueryCount).toBe(1);

    const second = logger.StartCapture();
    logger.logQuery('ROLLBACK');
    expect(logger.StopCapture(second)).toEqual({
      DataQueryCount: 0,
      SelectQueryCount: 0,
      TransactionControlCount: 1,
      ErrorCount: 0,
      SlowQueryCount: 0,
    });
    expect(() => logger.StopCapture(first)).toThrow('Query capture ownership mismatch');
  });

  it('classifies PostgreSQL control spellings and leading comments conservatively', () => {
    const logger = new QueryCounterLogger();
    const captureId = logger.StartCapture();

    logger.logQuery('BEGIN');
    logger.logQuery('-- rh_06_probe\nSELECT 1');
    logger.logQuery('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
    logger.logQuery('SET ROLE readonly_user');

    expect(logger.StopCapture(captureId)).toEqual({
      DataQueryCount: 2,
      SelectQueryCount: 1,
      TransactionControlCount: 2,
      ErrorCount: 0,
      SlowQueryCount: 0,
    });
  });

  it('does not misclassify a data-modifying CTE as a SELECT', () => {
    const logger = new QueryCounterLogger();
    const captureId = logger.StartCapture();

    logger.logQuery("WITH changed AS (UPDATE roles SET status = 'Inactive' RETURNING id) SELECT id FROM changed");

    expect(logger.StopCapture(captureId)).toEqual({
      DataQueryCount: 1,
      SelectQueryCount: 0,
      TransactionControlCount: 0,
      ErrorCount: 0,
      SlowQueryCount: 0,
    });
  });
});
