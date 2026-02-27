// ============================================
// TYPES VOOR CONSOLIDATIE APP KLANT IN BEELD
// ============================================

// === RESPONDENT & ROLES ===

export type RespondentRole =
  | "PO"           // Sectormanager Primair Onderwijs
  | "VO"           // Sectormanager Voortgezet Onderwijs
  | "Zakelijk"     // Sectormanager Zakelijk/Professionals
  | "Data & Tech"  // Manager Data & Technology
  | "HR"
  | "Overig";

export interface Respondent {
  id: string;
  name: string;
  role: RespondentRole;
  uploadedAt: Date;
}

// MT-leden voor credits
export const MT_MEMBERS = [
  "Roel",
  "Bert Thijs",
  "Leontine",
  "Jasper",
  "Cornelis"
] as const;

// === VRAAG TYPES ===

export type QuestionType =
  | "current_situation"      // Vraag A: Huidige situatie
  | "desired_situation"      // Vraag B: Gewenste situatie
  | "change_direction"       // Vraag C: Beweging
  | "stakeholders"           // Vraag D: Voor wie is dit relevant?
  | "goal_1"                 // Doel 1
  | "goal_2"                 // Doel 2
  | "goal_3"                 // Doel 3
  | "out_of_scope";          // Buiten scope

export type QuestionCategory = "visie" | "doelen" | "scope";

export const QUESTION_LABELS: Record<QuestionType, string> = {
  current_situation: "A: Huidige situatie",
  desired_situation: "B: Gewenste situatie",
  change_direction: "C: Beweging/verandering",
  stakeholders: "D: Belanghebbenden",
  goal_1: "Doel 1 (hoogste prioriteit)",
  goal_2: "Doel 2",
  goal_3: "Doel 3",
  out_of_scope: "Buiten scope"
};

export const QUESTION_CATEGORIES: Record<QuestionType, QuestionCategory> = {
  current_situation: "visie",
  desired_situation: "visie",
  change_direction: "visie",
  stakeholders: "visie",
  goal_1: "doelen",
  goal_2: "doelen",
  goal_3: "doelen",
  out_of_scope: "scope"
};

// === CANVAS RESPONSES ===

export interface CanvasResponse {
  id: string;
  respondentId: string;
  question: QuestionType;
  answer: string;
  extractedThemes?: string[];  // AI-extracted
}

export interface ParsedCanvas {
  respondent: Respondent;
  responses: CanvasResponse[];
}

// === THEME ANALYSIS ===

export type ConsensusLevel = "high" | "medium" | "low";

export interface ThemeCluster {
  id: string;
  name: string;
  description: string;
  questionType: QuestionType;
  relatedResponses: string[];  // Response IDs
  mentionedBy: string[];       // Respondent names/IDs
  consensusLevel: ConsensusLevel;
  aiConfidence: number;        // 0-1
  exampleQuotes: string[];
}

export interface Tension {
  themeA: string;
  themeB: string;
  description: string;
}

export interface Analysis {
  themes: ThemeCluster[];
  tensions: Tension[];
  quickWins: string[];         // Theme names met high consensus
  discussionPoints: string[];  // Theme names met spanning of low consensus
}

// === PROPOSALS & VOTING ===

export interface ProposalVariant {
  id: string;
  type: "beknopt" | "volledig" | "gebalanceerd";
  text: string;
  emphasizes: string;
  includesThemes: string[];
}

export interface Proposal {
  id: string;
  clusterId?: string;
  questionType: QuestionType;
  variants: ProposalVariant[];
  status: "draft" | "voting" | "approved" | "rejected";
  createdAt: Date;
  recommendation?: string;
  recommendationRationale?: string;
}

export type VoteValue = "agree" | "disagree" | "abstain";

export interface Vote {
  id: string;
  proposalId: string;
  variantId: string;
  respondentId: string;
  value: VoteValue;
  comment?: string;
  votedAt: Date;
}

export interface VoteResults {
  proposalId: string;
  variantId: string;
  agree: number;
  disagree: number;
  abstain: number;
  isApproved: boolean;  // true als consent bereikt (geen bezwaren)
}

// === FLOW STATE MANAGEMENT ===

export type FlowStep =
  | "upload"
  | "visie_huidige"
  | "visie_gewenste"
  | "visie_beweging"
  | "visie_stakeholders"
  | "doelen"
  | "scope"
  | "export";

export type StepStatus = "locked" | "active" | "completed";

export type SubStepStatus = "not_started" | "analyzing" | "voting" | "approved";

export interface SubStepState {
  status: SubStepStatus;
  themes?: ThemeCluster[];
  proposals?: Proposal[];
  approvedText?: string;
  approvedVariantId?: string;
  votes?: Vote[];
}

export interface FlowState {
  currentStep: FlowStep;
  steps: Record<FlowStep, StepStatus>;
  visie: {
    huidige: SubStepState;
    gewenste: SubStepState;
    beweging: SubStepState;
    stakeholders: SubStepState;
  };
  doelen: SubStepState;
  scope: SubStepState;
}

export const FLOW_ORDER: FlowStep[] = [
  "upload",
  "visie_huidige",
  "visie_gewenste",
  "visie_beweging",
  "visie_stakeholders",
  "doelen",
  "scope",
  "export"
];

export const FLOW_STEP_LABELS: Record<FlowStep, string> = {
  upload: "Upload",
  visie_huidige: "Huidige situatie",
  visie_gewenste: "Gewenste situatie",
  visie_beweging: "Beweging",
  visie_stakeholders: "Belanghebbenden",
  doelen: "Doelen",
  scope: "Scope",
  export: "Export"
};

// === SESSION & PERSISTENCE ===

export type SessionStatus = "in_progress" | "completed";

export interface StoredSession {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  status: SessionStatus;
  currentStep: FlowStep;
}

export interface StoredDocument {
  id: string;
  sessionId: string;
  filename: string;
  respondentId: string;
  uploadedAt: Date;
  rawText: string;
  parsedResponses: Record<QuestionType, string>;
}

export interface StoredAnalysis {
  id: string;
  sessionId: string;
  questionType: QuestionType;
  analyzedAt: Date;
  themes: ThemeCluster[];
  quickWins: string[];
  discussionPoints: string[];
}

export interface StoredProposal {
  id: string;
  sessionId: string;
  questionType: QuestionType;
  themeId?: string;
  variants: ProposalVariant[];
  status: "draft" | "voting" | "approved" | "rejected";
  createdAt: Date;
  approvedAt?: Date;
  approvedVariantId?: string;
}

export interface StoredVote {
  id: string;
  sessionId: string;
  proposalId: string;
  variantId: string;
  respondentId: string;
  value: VoteValue;
  comment?: string;
  votedAt: Date;
}

export interface StoredApprovedText {
  id: string;
  sessionId: string;
  questionType: QuestionType;
  text: string;
  approvedAt: Date;
  basedOnProposalId: string;
  basedOnVariantId: string;
}

export interface StoredFinalDocument {
  id: string;
  sessionId: string;
  vision: {
    currentSituation: string;
    desiredSituation: string;
    changeDirection: string;
    stakeholders: string;
  };
  goals: Array<{
    rank: number;
    text: string;
  }>;
  scope: {
    outOfScope: string[];
  };
  generatedAt: Date;
  exportedAt?: Date;
}

// === FINAL DOCUMENT ===

export interface FinalDocument {
  vision: {
    currentSituation: string;
    desiredSituation: string;
    changeDirection: string;
    stakeholders: string;
  };
  goals: Array<{
    rank: number;
    text: string;
    rationale?: string;
  }>;
  scope: {
    inScope?: string[];
    outOfScope: string[];
  };
  approvedAt: Date;
  approvedBy: string[];
}

// === HELPER FUNCTIONS ===

export function canProceedTo(currentState: FlowState, targetStep: FlowStep): boolean {
  const currentIndex = FLOW_ORDER.indexOf(currentState.currentStep);
  const targetIndex = FLOW_ORDER.indexOf(targetStep);

  // Kan altijd terug
  if (targetIndex <= currentIndex) return true;

  // Kan alleen vooruit als alle voorgaande stappen completed zijn
  for (let i = 0; i < targetIndex; i++) {
    if (currentState.steps[FLOW_ORDER[i]] !== "completed") {
      return false;
    }
  }
  return true;
}

export function getNextStep(currentStep: FlowStep): FlowStep | null {
  const currentIndex = FLOW_ORDER.indexOf(currentStep);
  if (currentIndex < FLOW_ORDER.length - 1) {
    return FLOW_ORDER[currentIndex + 1];
  }
  return null;
}

export function getPreviousStep(currentStep: FlowStep): FlowStep | null {
  const currentIndex = FLOW_ORDER.indexOf(currentStep);
  if (currentIndex > 0) {
    return FLOW_ORDER[currentIndex - 1];
  }
  return null;
}

export function isSessionComplete(state: FlowState): boolean {
  return (
    state.visie.huidige.status === "approved" &&
    state.visie.gewenste.status === "approved" &&
    state.visie.beweging.status === "approved" &&
    state.visie.stakeholders.status === "approved" &&
    state.doelen.status === "approved" &&
    state.scope.status === "approved"
  );
}

export function getInitialFlowState(): FlowState {
  return {
    currentStep: "upload",
    steps: {
      upload: "active",
      visie_huidige: "locked",
      visie_gewenste: "locked",
      visie_beweging: "locked",
      visie_stakeholders: "locked",
      doelen: "locked",
      scope: "locked",
      export: "locked"
    },
    visie: {
      huidige: { status: "not_started" },
      gewenste: { status: "not_started" },
      beweging: { status: "not_started" },
      stakeholders: { status: "not_started" }
    },
    doelen: { status: "not_started" },
    scope: { status: "not_started" }
  };
}
