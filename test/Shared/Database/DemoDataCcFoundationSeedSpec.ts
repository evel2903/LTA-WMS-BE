import {
  AssertDemoDataCcWritableMasterDataRow,
  BuildDemoDataCcFoundationCapabilityFlags,
  DemoDataCcFoundationFlowSamples,
} from '@shared/Database/Seed/DemoDataCcFoundationSeed';

describe('DemoDataCcFoundationSeed', () => {
  it('advertises only the current WT-01 demo flow sample in warehouse profile capability flags', () => {
    expect(DemoDataCcFoundationFlowSamples).toEqual(['WT-01']);
    expect(DemoDataCcFoundationFlowSamples).not.toContain('WT-05');
    expect(DemoDataCcFoundationFlowSamples).not.toContain('WT-06');
    expect(BuildDemoDataCcFoundationCapabilityFlags()).toEqual({
      demoData: true,
      flowSamples: ['WT-01'],
    });
  });

  it('blocks overwriting existing LTA master data that is not owned by the demo seed', () => {
    expect(() => AssertDemoDataCcWritableMasterDataRow({ SourceSystem: 'SEED' }, 'warehouse', 'LTA-HCM-01')).toThrow(
      'existing non-demo warehouse LTA-HCM-01',
    );

    expect(() =>
      AssertDemoDataCcWritableMasterDataRow({ SourceSystem: 'DEMO-DATA-LTA' }, 'warehouse', 'LTA-HCM-01'),
    ).not.toThrow();
  });
});
