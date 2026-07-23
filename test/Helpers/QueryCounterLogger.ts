import { Logger, QueryRunner } from 'typeorm';

export interface QueryCapture {
  DataQueryCount: number;
  SelectQueryCount: number;
  TransactionControlCount: number;
  ErrorCount: number;
  SlowQueryCount: number;
}

interface ActiveCapture {
  Id: number;
  Result: QueryCapture;
}

const EmptyCapture = (): QueryCapture => ({
  DataQueryCount: 0,
  SelectQueryCount: 0,
  TransactionControlCount: 0,
  ErrorCount: 0,
  SlowQueryCount: 0,
});

/** Test-only TypeORM logger that counts query shape without retaining SQL parameters. */
export class QueryCounterLogger implements Logger {
  private nextCaptureId = 1;
  private active: ActiveCapture | null = null;

  public StartCapture(): number {
    if (this.active) throw new Error('A query capture is already active');
    const id = this.nextCaptureId;
    this.nextCaptureId += 1;
    this.active = { Id: id, Result: EmptyCapture() };
    return id;
  }

  public StopCapture(captureId: number): QueryCapture {
    if (!this.active || this.active.Id !== captureId) throw new Error('Query capture ownership mismatch');
    const result = { ...this.active.Result };
    this.active = null;
    return result;
  }

  public logQuery(query: string, parameters?: unknown, queryRunner?: QueryRunner): void {
    void parameters;
    void queryRunner;
    if (!this.active) return;
    const normalizedQuery = this.WithoutLeadingComments(query);
    const statement = this.LeadingStatement(normalizedQuery);
    if (this.IsTransactionControl(normalizedQuery, statement)) {
      this.active.Result.TransactionControlCount += 1;
      return;
    }
    this.active.Result.DataQueryCount += 1;
    if (statement === 'SELECT') this.active.Result.SelectQueryCount += 1;
  }

  public logQueryError(error: string | Error, query: string, parameters?: unknown, queryRunner?: QueryRunner): void {
    void error;
    void query;
    void parameters;
    void queryRunner;
    if (this.active) this.active.Result.ErrorCount += 1;
  }

  public logQuerySlow(time: number, query: string, parameters?: unknown, queryRunner?: QueryRunner): void {
    void time;
    void query;
    void parameters;
    void queryRunner;
    if (this.active) this.active.Result.SlowQueryCount += 1;
  }

  public logSchemaBuild(message: string, queryRunner?: QueryRunner): void {
    void message;
    void queryRunner;
  }

  public logMigration(message: string, queryRunner?: QueryRunner): void {
    void message;
    void queryRunner;
  }

  public log(level: 'log' | 'info' | 'warn', message: unknown, queryRunner?: QueryRunner): void {
    void level;
    void message;
    void queryRunner;
  }

  private WithoutLeadingComments(query: string): string {
    let remaining = query.trimStart();
    while (remaining.length > 0) {
      if (remaining.startsWith('/*')) {
        const end = remaining.indexOf('*/', 2);
        if (end < 0) return '';
        remaining = remaining.slice(end + 2).trimStart();
        continue;
      }
      if (remaining.startsWith('--')) {
        const end = remaining.search(/[\r\n]/);
        if (end < 0) return '';
        remaining = remaining.slice(end + 1).trimStart();
        continue;
      }
      break;
    }
    return remaining;
  }

  private LeadingStatement(query: string): string {
    return query.split(/\s+/, 1)[0]?.toUpperCase() ?? '';
  }

  private IsTransactionControl(query: string, statement: string): boolean {
    if (['BEGIN', 'START', 'COMMIT', 'ROLLBACK', 'SAVEPOINT', 'RELEASE'].includes(statement)) return true;
    if (statement !== 'SET') return false;
    const normalized = query.replace(/\s+/g, ' ').trim().toUpperCase();
    return (
      normalized.startsWith('SET TRANSACTION ') || normalized.startsWith('SET SESSION CHARACTERISTICS AS TRANSACTION ')
    );
  }
}
