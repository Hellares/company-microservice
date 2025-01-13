import { CustomFieldType } from "../custom-fields/enums/custom-field-type.enum";

export enum CompanyPlan {
  FREE = 'free',
  BASIC = 'basic',
  PREMIUM = 'premium',
  ENTERPRISE = 'enterprise'
}

export const PLAN_FIELD_LIMITS = {
  [CompanyPlan.FREE]: {
    total: 5,
    perType: {
      [CustomFieldType.TEXT]: 2,
      [CustomFieldType.SCHEDULE]: 1,
      [CustomFieldType.SELECT]: 1,
      [CustomFieldType.MULTISELECT]: 1,
      [CustomFieldType.BOOLEAN]: 1,
      [CustomFieldType.DATE]: 1,
      [CustomFieldType.NUMBER]: 1,
      [CustomFieldType.EMAIL]: 1,
      [CustomFieldType.PHONE]: 1,
      [CustomFieldType.URL]: 1,
      [CustomFieldType.FILE]: 1,
      [CustomFieldType.JSON]: 1
    }
  },
  // ... otros planes
  [CompanyPlan.BASIC]: {
    total: 10,
    perType: {
      [CustomFieldType.TEXT]: 5,
      [CustomFieldType.SCHEDULE]: 2,
      [CustomFieldType.SELECT]: 2,
      [CustomFieldType.MULTISELECT]: 2,
      [CustomFieldType.BOOLEAN]: 2,
      [CustomFieldType.DATE]: 2,
      [CustomFieldType.NUMBER]: 2,
      [CustomFieldType.EMAIL]: 2,
      [CustomFieldType.PHONE]: 2,
      [CustomFieldType.URL]: 2,
      [CustomFieldType.FILE]: 2,
      [CustomFieldType.JSON]: 2
    }
  },
  // ... otros planes
  [CompanyPlan.PREMIUM]: {
    total: 20,
    perType: {
      [CustomFieldType.TEXT]: 10,
      [CustomFieldType.SCHEDULE]: 3,
      [CustomFieldType.SELECT]: 3,
      [CustomFieldType.MULTISELECT]: 3,
      [CustomFieldType.BOOLEAN]: 3,
      [CustomFieldType.DATE]: 3,
      [CustomFieldType.NUMBER]: 3,
      [CustomFieldType.EMAIL]: 3,
      [CustomFieldType.PHONE]: 3,
      [CustomFieldType.URL]: 3,
      [CustomFieldType.FILE]: 3,
      [CustomFieldType.JSON]: 3
    }
  },
};