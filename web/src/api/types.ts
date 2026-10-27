// Copied from docs/prd-frontend.md, section 8. Names match the backend (App/); no synonyms.

export type Country = "AR" | "BR";
export type Locale = "es" | "pt" | "en";

export type Rail = "ar_usdc" | "ar_swift" | "br_efx" | "br_fxbank";

export type DepositState =
  | "kyc_passed"
  | "ibkr_open"
  | "deposit_notified"
  | "partner_collected"
  | "fx_executed"
  | "wire_sent"
  | "broker_credited"
  | "invested"
  | "returned";

export type AccountStatus =
  | "draft"
  | "submitted"
  | "kyc_review"
  | "ibkr_pending"
  | "action_required"
  | "open"
  | "restricted"
  | "rejected";

export type BlockReason =
  | "ibkr_not_open"
  | "ibkr_restricted"
  | "compliance_hold"
  | "quote_expired"
  | "pix_med_hold"
  | "market_not_live";

export interface AppConfig {
  liveMarkets: Country[]; // hoje ["AR"]
  minRecurringUsdCents: number; // hoje 25000
  minDepositUsdCents: number; // a confirmar
  efxCapUsdCents: number; // 1000000 (Brasil)
  railsByCountry: Record<Country, Rail[]>;
  investmentWindowDay: number; // dia do mês da janela (a confirmar)
  ibkrPortalUrl: string;
}

export interface Me {
  id: string;
  name: string;
  email: string;
  country: Country;
  locale: Locale;
  accountStatus: AccountStatus;
}

export interface PendingItem {
  id: string;
  kind: "document" | "deposit_action" | "terms" | "notice";
  title: string;
  description: string;
  dueAt?: string;
  depositId?: string;
}

export interface Account {
  status: AccountStatus;
  ibkrAccountMasked?: string; // ex.: "U****1234"; nunca credenciais
  pending: PendingItem[];
  blockReasons: BlockReason[];
}

export interface CostLine {
  kind: "iof" | "fx_spread" | "rail_fee" | "allocation_min" | "advisory_fee";
  label: string;
  amountCents: number;
  percent: number; // 0.011 = 1,1%
  estimated: boolean; // true quando é valor (assumed) do config
}

export interface RailOption {
  rail: Rail;
  recommended: boolean;
  costs: CostLine[];
  totalCostCents: number;
  netToInvestCents: number;
  expectedDays: { min: number; max: number };
}

export interface Quote {
  id: string;
  amountCents: number;
  options: RailOption[];
  expiresAt: string;
}

export interface DepositInstructionsUsdc {
  type: "usdc";
  token: "USDC";
  network: string; // vindo da API; nunca fixo no front
  address: string;
  memo?: string;
}

export interface DepositInstructionsWire {
  type: "wire";
  beneficiaryName: string;
  accountNumber: string;
  bankName: string;
  swiftBic: string;
  reference: string; // obrigatória
}

export interface StateEvent {
  state: DepositState;
  at: string;
}

export interface Deposit {
  id: string;
  rail: Rail;
  state: DepositState;
  amountCents: number;
  costs: CostLine[];
  creditedCents?: number;
  investedCents?: number;
  history: StateEvent[];
  expectedBy?: string; // prazo esperado do estado atual
  nextInvestmentWindow?: string;
  instructions?: DepositInstructionsUsdc | DepositInstructionsWire;
  returnReason?: string;
  createdAt: string;
}

export interface Position {
  isin: string; // UCITS, nunca começa com "US"
  name: string;
  shares: number; // ações inteiras
  valueCents: number;
  weight: number;
  targetWeight: number;
  description: string;
}

export interface Portfolio {
  totalCents: number;
  buckets: {
    inFlightCents: number;
    ibkrCashCents: number;
    investedCents: number;
    feesPaidCents: number;
  };
  positions: Position[];
  asOf: string; // última reconciliação com a IBKR
}

export interface Plan {
  id: string;
  amountCents: number;
  dayOfMonth: number;
  rail: Rail;
  status: "active" | "paused" | "cancelled";
  nextRunAt?: string;
}
