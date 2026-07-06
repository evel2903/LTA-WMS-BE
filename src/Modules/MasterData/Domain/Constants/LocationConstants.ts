// IFB-13: shared by ReleaseInboundToPutawayUseCase and ReleasePutawayTaskUseCase so the default
// staging location code can't drift between the two independent resolution call sites.
export const DEFAULT_STAGING_LOCATION_CODE = 'RECEIVING';
