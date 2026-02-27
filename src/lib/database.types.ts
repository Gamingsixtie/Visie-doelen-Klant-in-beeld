// ============================================
// SUPABASE DATABASE TYPES
// Auto-generated type definitions for database tables
// ============================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      sessions: {
        Row: {
          id: string;
          name: string;
          created_at: string;
          updated_at: string;
          status: "in_progress" | "completed";
          current_step: string;
          flow_state: Json;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
          updated_at?: string;
          status?: "in_progress" | "completed";
          current_step?: string;
          flow_state?: Json;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
          updated_at?: string;
          status?: "in_progress" | "completed";
          current_step?: string;
          flow_state?: Json;
        };
      };
      documents: {
        Row: {
          id: string;
          session_id: string;
          filename: string;
          respondent_id: string;
          respondent_name: string;
          respondent_role: string;
          uploaded_at: string;
          raw_text: string;
          parsed_responses: Json;
        };
        Insert: {
          id?: string;
          session_id: string;
          filename: string;
          respondent_id: string;
          respondent_name: string;
          respondent_role?: string;
          uploaded_at?: string;
          raw_text: string;
          parsed_responses: Json;
        };
        Update: {
          id?: string;
          session_id?: string;
          filename?: string;
          respondent_id?: string;
          respondent_name?: string;
          respondent_role?: string;
          uploaded_at?: string;
          raw_text?: string;
          parsed_responses?: Json;
        };
      };
      analyses: {
        Row: {
          id: string;
          session_id: string;
          question_type: string;
          analyzed_at: string;
          themes: Json;
          tensions: Json;
          quick_wins: Json;
          discussion_points: Json;
        };
        Insert: {
          id?: string;
          session_id: string;
          question_type: string;
          analyzed_at?: string;
          themes: Json;
          tensions?: Json;
          quick_wins?: Json;
          discussion_points?: Json;
        };
        Update: {
          id?: string;
          session_id?: string;
          question_type?: string;
          analyzed_at?: string;
          themes?: Json;
          tensions?: Json;
          quick_wins?: Json;
          discussion_points?: Json;
        };
      };
      proposals: {
        Row: {
          id: string;
          session_id: string;
          question_type: string;
          theme_id: string | null;
          variants: Json;
          status: "draft" | "voting" | "approved" | "rejected";
          created_at: string;
          approved_at: string | null;
          approved_variant_id: string | null;
          recommendation: string | null;
          recommendation_rationale: string | null;
        };
        Insert: {
          id?: string;
          session_id: string;
          question_type: string;
          theme_id?: string | null;
          variants: Json;
          status?: "draft" | "voting" | "approved" | "rejected";
          created_at?: string;
          approved_at?: string | null;
          approved_variant_id?: string | null;
          recommendation?: string | null;
          recommendation_rationale?: string | null;
        };
        Update: {
          id?: string;
          session_id?: string;
          question_type?: string;
          theme_id?: string | null;
          variants?: Json;
          status?: "draft" | "voting" | "approved" | "rejected";
          created_at?: string;
          approved_at?: string | null;
          approved_variant_id?: string | null;
          recommendation?: string | null;
          recommendation_rationale?: string | null;
        };
      };
      votes: {
        Row: {
          id: string;
          session_id: string;
          proposal_id: string;
          variant_id: string;
          respondent_id: string;
          value: "agree" | "disagree" | "abstain";
          comment: string | null;
          voted_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          proposal_id: string;
          variant_id: string;
          respondent_id: string;
          value: "agree" | "disagree" | "abstain";
          comment?: string | null;
          voted_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          proposal_id?: string;
          variant_id?: string;
          respondent_id?: string;
          value?: "agree" | "disagree" | "abstain";
          comment?: string | null;
          voted_at?: string;
        };
      };
      approved_texts: {
        Row: {
          id: string;
          session_id: string;
          question_type: string;
          text: string;
          approved_at: string;
          based_on_proposal_id: string;
          based_on_variant_id: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          question_type: string;
          text: string;
          approved_at?: string;
          based_on_proposal_id: string;
          based_on_variant_id: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          question_type?: string;
          text?: string;
          approved_at?: string;
          based_on_proposal_id?: string;
          based_on_variant_id?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      session_status: "in_progress" | "completed";
      proposal_status: "draft" | "voting" | "approved" | "rejected";
      vote_value: "agree" | "disagree" | "abstain";
    };
  };
}
