export interface Supplier { id:number; name:string; document?:string; email?:string; phone?:string; active:boolean; }
export type CutStatus = 'ACTIVE'|'INACTIVE';
export interface Cut { id:number; supplierId:number; supplierName:string; cutNumber:string; description:string; packages:number; piecesPerPackage:number; unitPricePerPiece:number; productionDate:string; totalPieces:number; totalAmount:number; status:CutStatus; billedAt?:string; }
export interface CutPayload { supplierId:number; cutNumber:string; description:string; packages:number; piecesPerPackage:number; unitPricePerPiece:number; productionDate:string; }
export interface SettlementItem { cutId:number; cutNumber:string; description:string; packages:number; piecesPerPackage:number; unitPricePerPiece:number; productionDate:string; totalPieces:number; totalAmount:number; }
export interface Settlement { id:number; invoiceNumber:string; supplierId:number; supplierName:string; settledAt:string; totalPieces:number; totalAmount:number; createdBy:string; items:SettlementItem[]; }
export interface Dashboard { suppliers:number; activeCuts:number; settlementsThisMonth:number; invoicedThisMonth:number; recentSettlements:Settlement[]; }
export interface OfflineBackup { version:1; exportedAt?:string; suppliers:Supplier[]; cuts:Cut[]; settlements:Settlement[]; }
