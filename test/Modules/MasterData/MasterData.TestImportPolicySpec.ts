import { readFileSync } from 'fs';
import { join } from 'path';

const RepoRoot = process.cwd();

describe('MasterData test import policy', () => {
  it('uses a first-class @test alias instead of @app path traversal for shared test helpers', () => {
    const tsconfig = JSON.parse(readFileSync(join(RepoRoot, 'tsconfig.json'), 'utf8')) as {
      compilerOptions: { paths: Record<string, string[]> };
    };
    const jestConfig = readFileSync(join(RepoRoot, 'jest.config.js'), 'utf8');
    const specFiles = [
      'test/Modules/MasterData/MasterData.InventoryBalanceUseCaseSpec.ts',
      'test/Modules/MasterData/MasterData.InventoryDimensionUseCaseSpec.ts',
      'test/Modules/MasterData/MasterData.InventoryModelIntegrationSpec.ts',
      'test/Modules/MasterData/MasterData.InventoryRepositorySpec.ts',
    ];

    expect(tsconfig.compilerOptions.paths['@test/*']).toEqual(['./test/*']);
    expect(jestConfig).toContain("'^@test/(.*)$'");

    for (const specFile of specFiles) {
      const content = readFileSync(join(RepoRoot, specFile), 'utf8');
      expect(content).not.toContain('@app/../test');
      expect(content).toContain('@test/Modules/MasterData/InventoryTestDoubles');
    }
  });
});
