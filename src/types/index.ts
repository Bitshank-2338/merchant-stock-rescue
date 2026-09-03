export type TransferStatus = "pending" | "approved" | "rejected" | "committed";
export type ActivityActor = "agent" | "human" | "system";

export interface Merchant {
  id: string;
  name: string;
  area: string;
  distanceKm: number;
  pickupMinutes: number;
  reliability: number;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  sku: string;
}

export interface InventoryRecord {
  merchantId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface CustomerRequest {
  productId: string;
  productName: string;
  quantity: number;
  urgency: "Today";
  destinationMerchantId: string;
}

export interface InventoryCandidate {
  merchantId: string;
  merchantName: string;
  area: string;
  productId: string;
  productName: string;
  availableQuantity: number;
  unitPrice: number;
  distanceKm: number;
  pickupMinutes: number;
  reliability: number;
}

export interface TransferProposal {
  id: string;
  sourceMerchantId: string;
  destinationMerchantId: string;
  productId: string;
  quantity: number;
  status: TransferStatus;
  approvedByHuman: boolean;
  createdAt: string;
  transactionId?: string;
}

export interface TransferStatusDetails {
  transferId: string;
  status: TransferStatus;
  approvedByHuman: boolean;
  product: { id: string; name: string };
  quantity: number;
  source: { id: string; name: string };
  destination: { id: string; name: string };
  transactionId?: string;
}

export interface TransferReceipt {
  transactionId: string;
  transferId: string;
  status: "committed";
  productName: string;
  quantity: number;
  sourceName: string;
  destinationName: string;
  remainingSourceStock: number;
}

export interface ActivityEvent {
  id: string;
  actor: ActivityActor;
  action: string;
  detail: string;
  timestamp: string;
}

export interface AppSnapshot {
  merchants: Merchant[];
  products: Product[];
  inventory: InventoryRecord[];
  request: CustomerRequest;
  searchResults: InventoryCandidate[];
  activeProposal: TransferProposal | null;
  transfers: TransferProposal[];
  activity: ActivityEvent[];
}

export type ToolErrorCode =
  | "INVALID_INPUT"
  | "PRODUCT_NOT_FOUND"
  | "INSUFFICIENT_QUANTITY"
  | "INVALID_MERCHANT"
  | "INVALID_QUANTITY"
  | "MISSING_PROPOSAL"
  | "PROPOSAL_REJECTED"
  | "HUMAN_APPROVAL_REQUIRED"
  | "ALREADY_COMMITTED"
  | "INVALID_TRANSFER_ID"
  | "INVALID_STATE_TRANSITION";

export interface ToolSuccess<T> {
  ok: true;
  data: T;
}

export interface ToolFailure {
  ok: false;
  error: { code: ToolErrorCode; message: string };
}

export type ToolResult<T> = ToolSuccess<T> | ToolFailure;
