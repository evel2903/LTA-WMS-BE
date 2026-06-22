export const V1_FORBIDDEN_INVENTORY_STATUS_MILESTONES = ['SHIPPED', 'GATE_OUT', 'GOODS_ISSUE_POSTED'] as const;

export type V1WarehouseTypeCode = 'WT-01' | 'WT-05' | 'WT-06';

type ReferencePayload = {
  Id: string;
  ExternalReference: string;
  Text: string;
};

export type V1CoreFlowFixture = {
  WarehouseTypeCode: V1WarehouseTypeCode;
  Warehouse: {
    WarehouseCode: string;
    WarehouseName: string;
    WarehouseTypeCode: V1WarehouseTypeCode;
  };
  WarehouseProfile: {
    ProfileCode: string;
    WarehouseTypeCode: V1WarehouseTypeCode;
    StrategyPolicy: {
      goodsIssueTrigger?: 'at_loading' | 'at_gate_out';
    };
  };
  Owner: {
    OwnerCode: string;
    OwnerName: string;
  };
  Sku: {
    SkuCode: string;
    SkuName: string;
  };
  Uoms: Array<{
    UomCode: string;
    UomName: string;
  }>;
  Barcodes: Array<{
    BarcodeValue: string;
    UomCode: string;
  }>;
  Partners: {
    Supplier: ReferencePayload;
    Customer: ReferencePayload;
    Carrier: ReferencePayload;
  };
  InboundSample: {
    BusinessReference: string;
    ExpectedMilestones: string[];
  };
  OutboundSample: {
    BusinessReference: string;
    ExpectedMilestones: string[];
  };
  ExpectedPath: {
    InventoryStatuses: string[];
    WorkflowMilestones: string[];
    ShipmentMilestones: string[];
  };
};

const warehouseTypes: V1WarehouseTypeCode[] = ['WT-01', 'WT-05', 'WT-06'];

const inventoryStatuses = [
  'PENDING_RECEIPT',
  'PENDING_QC',
  'READY_FOR_PUTAWAY',
  'AVAILABLE',
  'ALLOCATED',
  'RELEASED',
  'PICK_IN_PROGRESS',
  'PICKED',
  'PACKED',
  'READY_FOR_STAGING',
  'STAGED',
  'LOADING_IN_PROGRESS',
  'LOADED',
];

const workflowMilestones = [
  'INBOUND_CREATED',
  'GATE_IN_RECORDED',
  'RECEIPT_CONFIRMED',
  'QC_COMPLETED',
  'PUTAWAY_COMPLETED',
  'OUTBOUND_IMPORTED',
  'ALLOCATION_COMPLETED',
  'PICK_RELEASED',
  'PACK_CONFIRMED',
];

const shipmentMilestones = ['SHIPMENT_CONFIRMED', 'GATE_OUT', 'GOODS_ISSUE_POSTED'];

export class V1CoreFlowFixtureBuilder {
  public BuildAll(): V1CoreFlowFixture[] {
    return warehouseTypes.map((warehouseType, index) => this.Build(warehouseType, index + 1));
  }

  public Build(warehouseTypeCode: V1WarehouseTypeCode, ordinal = 1): V1CoreFlowFixture {
    const suffix = warehouseTypeCode.replace('-', '');
    return {
      WarehouseTypeCode: warehouseTypeCode,
      Warehouse: {
        WarehouseCode: `WH-${warehouseTypeCode}`,
        WarehouseName: `${warehouseTypeCode} V1 Fixture Warehouse`,
        WarehouseTypeCode: warehouseTypeCode,
      },
      WarehouseProfile: {
        ProfileCode: `WP-${warehouseTypeCode}-V1`,
        WarehouseTypeCode: warehouseTypeCode,
        StrategyPolicy: warehouseTypeCode === 'WT-06' ? { goodsIssueTrigger: 'at_gate_out' } : {},
      },
      Owner: {
        OwnerCode: `OWNER-${suffix}`,
        OwnerName: `${warehouseTypeCode} Fixture Owner`,
      },
      Sku: {
        SkuCode: `SKU-${suffix}-CORE`,
        SkuName: `${warehouseTypeCode} Core Flow SKU`,
      },
      Uoms: [
        { UomCode: 'EA', UomName: 'Each' },
        { UomCode: 'CASE', UomName: 'Case' },
      ],
      Barcodes: [
        {
          BarcodeValue: `89900000010${ordinal}`,
          UomCode: 'CASE',
        },
      ],
      Partners: {
        Supplier: this.Reference('SUP', suffix),
        Customer: this.Reference('CUS', suffix),
        Carrier: this.Reference('CAR', suffix),
      },
      InboundSample: {
        BusinessReference: `INB-${suffix}-001`,
        ExpectedMilestones: ['INBOUND_CREATED', 'GATE_IN_RECORDED', 'RECEIPT_CONFIRMED', 'QC_COMPLETED'],
      },
      OutboundSample: {
        BusinessReference: `OUT-${suffix}-001`,
        ExpectedMilestones: ['OUTBOUND_IMPORTED', 'ALLOCATION_COMPLETED', 'PICK_RELEASED', 'PACK_CONFIRMED'],
      },
      ExpectedPath: {
        InventoryStatuses: [...inventoryStatuses],
        WorkflowMilestones: [...workflowMilestones],
        ShipmentMilestones: [...shipmentMilestones],
      },
    };
  }

  private Reference(prefix: string, suffix: string): ReferencePayload {
    return {
      Id: `${prefix}-${suffix}`,
      ExternalReference: `EXT-${prefix}-${suffix}`,
      Text: `${prefix} ${suffix} partner reference`,
    };
  }
}
