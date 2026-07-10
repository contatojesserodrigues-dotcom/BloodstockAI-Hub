export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          metadata: Json | null
          resource_id: string | null
          resource_type: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      analysis_feedback: {
        Row: {
          accuracy_score: number | null
          analysis_id: string | null
          analysis_type: string
          created_at: string | null
          feedback_notes: string | null
          helpful: boolean | null
          id: string
          user_id: string
        }
        Insert: {
          accuracy_score?: number | null
          analysis_id?: string | null
          analysis_type: string
          created_at?: string | null
          feedback_notes?: string | null
          helpful?: boolean | null
          id?: string
          user_id: string
        }
        Update: {
          accuracy_score?: number | null
          analysis_id?: string | null
          analysis_type?: string
          created_at?: string | null
          feedback_notes?: string | null
          helpful?: boolean | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      analysis_reports: {
        Row: {
          analysis_type: Database["public"]["Enums"]["analysis_type"]
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          horse_id: string | null
          id: string
          input_data: Json
          market_value_estimate: number | null
          pdf_url: string | null
          pedigree_score: number | null
          performance_score: number | null
          recommendations: string[] | null
          result_data: Json | null
          roi_projection: string | null
          status: Database["public"]["Enums"]["report_status"] | null
          user_id: string
        }
        Insert: {
          analysis_type: Database["public"]["Enums"]["analysis_type"]
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          horse_id?: string | null
          id?: string
          input_data: Json
          market_value_estimate?: number | null
          pdf_url?: string | null
          pedigree_score?: number | null
          performance_score?: number | null
          recommendations?: string[] | null
          result_data?: Json | null
          roi_projection?: string | null
          status?: Database["public"]["Enums"]["report_status"] | null
          user_id: string
        }
        Update: {
          analysis_type?: Database["public"]["Enums"]["analysis_type"]
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          horse_id?: string | null
          id?: string
          input_data?: Json
          market_value_estimate?: number | null
          pdf_url?: string | null
          pedigree_score?: number | null
          performance_score?: number | null
          recommendations?: string[] | null
          result_data?: Json | null
          roi_projection?: string | null
          status?: Database["public"]["Enums"]["report_status"] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analysis_reports_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses"
            referencedColumns: ["id"]
          },
        ]
      }
      authorized_users: {
        Row: {
          can_edit: boolean | null
          created_at: string | null
          email: string
          full_access: boolean
          role: string
        }
        Insert: {
          can_edit?: boolean | null
          created_at?: string | null
          email: string
          full_access?: boolean
          role?: string
        }
        Update: {
          can_edit?: boolean | null
          created_at?: string | null
          email?: string
          full_access?: boolean
          role?: string
        }
        Relationships: []
      }
      breeding_market_cache: {
        Row: {
          cache_key: string
          fetched_at: string
          payload: Json
        }
        Insert: {
          cache_key: string
          fetched_at?: string
          payload: Json
        }
        Update: {
          cache_key?: string
          fetched_at?: string
          payload?: Json
        }
        Relationships: []
      }
      broodmare_plans: {
        Row: {
          analysis_result: Json | null
          breeding_goals: string | null
          created_at: string | null
          id: string
          mare_id: string | null
          recommended_stallions: Json | null
          user_id: string
        }
        Insert: {
          analysis_result?: Json | null
          breeding_goals?: string | null
          created_at?: string | null
          id?: string
          mare_id?: string | null
          recommended_stallions?: Json | null
          user_id: string
        }
        Update: {
          analysis_result?: Json | null
          breeding_goals?: string | null
          created_at?: string | null
          id?: string
          mare_id?: string | null
          recommended_stallions?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "broodmare_plans_mare_id_fkey"
            columns: ["mare_id"]
            isOneToOne: false
            referencedRelation: "horses"
            referencedColumns: ["id"]
          },
        ]
      }
      broodmare_plans_v2: {
        Row: {
          analytics: Json
          created_at: string
          duration_years: number
          id: string
          mare: Json
          objectives: string[]
          pdf_url: string | null
          pedigree_extraction: Json | null
          seasons: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          analytics?: Json
          created_at?: string
          duration_years: number
          id?: string
          mare: Json
          objectives?: string[]
          pdf_url?: string | null
          pedigree_extraction?: Json | null
          seasons?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          analytics?: Json
          created_at?: string
          duration_years?: number
          id?: string
          mare?: Json
          objectives?: string[]
          pdf_url?: string | null
          pedigree_extraction?: Json | null
          seasons?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      catalog_analyses: {
        Row: {
          analysis_sections: Json
          breed_type: string | null
          created_at: string
          currency: string | null
          extraction: Json
          foaling_year: number | null
          id: string
          research: Json
          sale_date: string | null
          sale_location: string | null
          sale_name: string
          scored_lots: Json
          shortlist: Json
          user_id: string
        }
        Insert: {
          analysis_sections?: Json
          breed_type?: string | null
          created_at?: string
          currency?: string | null
          extraction?: Json
          foaling_year?: number | null
          id?: string
          research?: Json
          sale_date?: string | null
          sale_location?: string | null
          sale_name: string
          scored_lots?: Json
          shortlist?: Json
          user_id: string
        }
        Update: {
          analysis_sections?: Json
          breed_type?: string | null
          created_at?: string
          currency?: string | null
          extraction?: Json
          foaling_year?: number | null
          id?: string
          research?: Json
          sale_date?: string | null
          sale_location?: string | null
          sale_name?: string
          scored_lots?: Json
          shortlist?: Json
          user_id?: string
        }
        Relationships: []
      }
      catalog_research_cache: {
        Row: {
          cache_key: string
          fetched_at: string
          payload: Json
        }
        Insert: {
          cache_key: string
          fetched_at?: string
          payload: Json
        }
        Update: {
          cache_key?: string
          fetched_at?: string
          payload?: Json
        }
        Relationships: []
      }
      catalogue_lots: {
        Row: {
          analyst_scores: Json | null
          aw_runs: number | null
          aw_wins: number | null
          bha_rating: number | null
          breeder: string | null
          buyer: string | null
          catalogue_id: string | null
          chunk_index: number | null
          color: string | null
          consignor: string | null
          covered_by: string | null
          created_at: string | null
          currency: string | null
          dam: string | null
          dam_dam: string | null
          dam_foals: Json | null
          dam_profile: Json | null
          dam_race_record: string | null
          dam_sire: string | null
          dam2_name: string | null
          dam2_record: string | null
          dam3_name: string | null
          description: string | null
          dob: string | null
          dosage_di: number | null
          earnings: string | null
          enriched_at: string | null
          has_raced: boolean | null
          horse_name: string | null
          id: string
          in_foal: boolean | null
          inbreeding_coefficient: number | null
          is_unnamed: boolean | null
          last_3_starts: Json | null
          last_service_date: string | null
          lot_number: string | null
          lot_status: string | null
          lot_type: string | null
          nick_rating: string | null
          notable_relatives: Json | null
          overall_score: number | null
          pedigree_complete: Json | null
          pedigree_g2: Json | null
          pedigree_g3: Json | null
          pedigree_g4: Json | null
          pedigree_raw: string | null
          potential_flags: Json | null
          potential_score: number | null
          potential_summary: string | null
          race_summary: string | null
          raw_text: string | null
          reserve_price: number | null
          sex: string | null
          siblings_full: Json | null
          sire: string | null
          sire_dam: string | null
          sire_profile: Json | null
          sire_sire: string | null
          sire_sire_sire: string | null
          sold_price: number | null
          turf_runs: number | null
          turf_wins: number | null
          vat_status: string | null
          withdrawn: boolean | null
          year_born: number | null
        }
        Insert: {
          analyst_scores?: Json | null
          aw_runs?: number | null
          aw_wins?: number | null
          bha_rating?: number | null
          breeder?: string | null
          buyer?: string | null
          catalogue_id?: string | null
          chunk_index?: number | null
          color?: string | null
          consignor?: string | null
          covered_by?: string | null
          created_at?: string | null
          currency?: string | null
          dam?: string | null
          dam_dam?: string | null
          dam_foals?: Json | null
          dam_profile?: Json | null
          dam_race_record?: string | null
          dam_sire?: string | null
          dam2_name?: string | null
          dam2_record?: string | null
          dam3_name?: string | null
          description?: string | null
          dob?: string | null
          dosage_di?: number | null
          earnings?: string | null
          enriched_at?: string | null
          has_raced?: boolean | null
          horse_name?: string | null
          id?: string
          in_foal?: boolean | null
          inbreeding_coefficient?: number | null
          is_unnamed?: boolean | null
          last_3_starts?: Json | null
          last_service_date?: string | null
          lot_number?: string | null
          lot_status?: string | null
          lot_type?: string | null
          nick_rating?: string | null
          notable_relatives?: Json | null
          overall_score?: number | null
          pedigree_complete?: Json | null
          pedigree_g2?: Json | null
          pedigree_g3?: Json | null
          pedigree_g4?: Json | null
          pedigree_raw?: string | null
          potential_flags?: Json | null
          potential_score?: number | null
          potential_summary?: string | null
          race_summary?: string | null
          raw_text?: string | null
          reserve_price?: number | null
          sex?: string | null
          siblings_full?: Json | null
          sire?: string | null
          sire_dam?: string | null
          sire_profile?: Json | null
          sire_sire?: string | null
          sire_sire_sire?: string | null
          sold_price?: number | null
          turf_runs?: number | null
          turf_wins?: number | null
          vat_status?: string | null
          withdrawn?: boolean | null
          year_born?: number | null
        }
        Update: {
          analyst_scores?: Json | null
          aw_runs?: number | null
          aw_wins?: number | null
          bha_rating?: number | null
          breeder?: string | null
          buyer?: string | null
          catalogue_id?: string | null
          chunk_index?: number | null
          color?: string | null
          consignor?: string | null
          covered_by?: string | null
          created_at?: string | null
          currency?: string | null
          dam?: string | null
          dam_dam?: string | null
          dam_foals?: Json | null
          dam_profile?: Json | null
          dam_race_record?: string | null
          dam_sire?: string | null
          dam2_name?: string | null
          dam2_record?: string | null
          dam3_name?: string | null
          description?: string | null
          dob?: string | null
          dosage_di?: number | null
          earnings?: string | null
          enriched_at?: string | null
          has_raced?: boolean | null
          horse_name?: string | null
          id?: string
          in_foal?: boolean | null
          inbreeding_coefficient?: number | null
          is_unnamed?: boolean | null
          last_3_starts?: Json | null
          last_service_date?: string | null
          lot_number?: string | null
          lot_status?: string | null
          lot_type?: string | null
          nick_rating?: string | null
          notable_relatives?: Json | null
          overall_score?: number | null
          pedigree_complete?: Json | null
          pedigree_g2?: Json | null
          pedigree_g3?: Json | null
          pedigree_g4?: Json | null
          pedigree_raw?: string | null
          potential_flags?: Json | null
          potential_score?: number | null
          potential_summary?: string | null
          race_summary?: string | null
          raw_text?: string | null
          reserve_price?: number | null
          sex?: string | null
          siblings_full?: Json | null
          sire?: string | null
          sire_dam?: string | null
          sire_profile?: Json | null
          sire_sire?: string | null
          sire_sire_sire?: string | null
          sold_price?: number | null
          turf_runs?: number | null
          turf_wins?: number | null
          vat_status?: string | null
          withdrawn?: boolean | null
          year_born?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "catalogue_lots_catalogue_id_fkey"
            columns: ["catalogue_id"]
            isOneToOne: false
            referencedRelation: "catalogues"
            referencedColumns: ["id"]
          },
        ]
      }
      catalogue_uploads_log: {
        Row: {
          catalogue_name: string | null
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          catalogue_name?: string | null
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          catalogue_name?: string | null
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      catalogues: {
        Row: {
          auction_house: string
          catalog_hash: string | null
          created_at: string | null
          file_size_mb: number | null
          id: string
          pdf_processed: boolean | null
          pdf_url: string | null
          processed_chunks: number | null
          processed_lots: number | null
          sale_date: string | null
          sale_name: string
          sale_year: number | null
          source_url: string | null
          status: string | null
          storage_path: string | null
          storage_url: string | null
          total_chunks: number | null
          total_lots: number | null
          updated_at: string | null
        }
        Insert: {
          auction_house: string
          catalog_hash?: string | null
          created_at?: string | null
          file_size_mb?: number | null
          id?: string
          pdf_processed?: boolean | null
          pdf_url?: string | null
          processed_chunks?: number | null
          processed_lots?: number | null
          sale_date?: string | null
          sale_name: string
          sale_year?: number | null
          source_url?: string | null
          status?: string | null
          storage_path?: string | null
          storage_url?: string | null
          total_chunks?: number | null
          total_lots?: number | null
          updated_at?: string | null
        }
        Update: {
          auction_house?: string
          catalog_hash?: string | null
          created_at?: string | null
          file_size_mb?: number | null
          id?: string
          pdf_processed?: boolean | null
          pdf_url?: string | null
          processed_chunks?: number | null
          processed_lots?: number | null
          sale_date?: string | null
          sale_name?: string
          sale_year?: number | null
          source_url?: string | null
          status?: string | null
          storage_path?: string | null
          storage_url?: string | null
          total_chunks?: number | null
          total_lots?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      dams: {
        Row: {
          country: string | null
          created_at: string | null
          dam: string | null
          id: string
          last_updated: string | null
          name: string
          produce_record: Json | null
          race_record: Json | null
          sire: string | null
          stakes_winners: number | null
          total_foals: number | null
          total_winners: number | null
          year_born: number | null
        }
        Insert: {
          country?: string | null
          created_at?: string | null
          dam?: string | null
          id?: string
          last_updated?: string | null
          name: string
          produce_record?: Json | null
          race_record?: Json | null
          sire?: string | null
          stakes_winners?: number | null
          total_foals?: number | null
          total_winners?: number | null
          year_born?: number | null
        }
        Update: {
          country?: string | null
          created_at?: string | null
          dam?: string | null
          id?: string
          last_updated?: string | null
          name?: string
          produce_record?: Json | null
          race_record?: Json | null
          sire?: string | null
          stakes_winners?: number | null
          total_foals?: number | null
          total_winners?: number | null
          year_born?: number | null
        }
        Relationships: []
      }
      data_sources_log: {
        Row: {
          data_type: string | null
          error_message: string | null
          id: string
          last_fetched: string | null
          records_collected: number | null
          source_name: string | null
          source_url: string | null
          status: string | null
        }
        Insert: {
          data_type?: string | null
          error_message?: string | null
          id?: string
          last_fetched?: string | null
          records_collected?: number | null
          source_name?: string | null
          source_url?: string | null
          status?: string | null
        }
        Update: {
          data_type?: string | null
          error_message?: string | null
          id?: string
          last_fetched?: string | null
          records_collected?: number | null
          source_name?: string | null
          source_url?: string | null
          status?: string | null
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          error_message: string | null
          id: string
          metadata: Json | null
          recipient: string
          sent_at: string | null
          status: string | null
          subject: string | null
          type: string
        }
        Insert: {
          error_message?: string | null
          id?: string
          metadata?: Json | null
          recipient: string
          sent_at?: string | null
          status?: string | null
          subject?: string | null
          type: string
        }
        Update: {
          error_message?: string | null
          id?: string
          metadata?: Json | null
          recipient?: string
          sent_at?: string | null
          status?: string | null
          subject?: string | null
          type?: string
        }
        Relationships: []
      }
      extracted_data: {
        Row: {
          created_at: string | null
          horse_name: string | null
          id: string
          pedigree_data: Json | null
          performance_data: Json | null
          progeny_data: Json | null
          raw_data: Json | null
          sales_data: Json | null
          siblings_data: Json | null
          source_id: string | null
          source_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          horse_name?: string | null
          id?: string
          pedigree_data?: Json | null
          performance_data?: Json | null
          progeny_data?: Json | null
          raw_data?: Json | null
          sales_data?: Json | null
          siblings_data?: Json | null
          source_id?: string | null
          source_type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          horse_name?: string | null
          id?: string
          pedigree_data?: Json | null
          performance_data?: Json | null
          progeny_data?: Json | null
          raw_data?: Json | null
          sales_data?: Json | null
          siblings_data?: Json | null
          source_id?: string | null
          source_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      horse_database: {
        Row: {
          best_distance: string | null
          best_rating: string | null
          best_surface: string | null
          breeder: string | null
          career_stats: Json | null
          citations: Json | null
          color: string | null
          country: string | null
          dam: string | null
          dam_dam: string | null
          dam_sire: string | null
          first_searched_at: string | null
          full_data: Json | null
          generation_3: Json | null
          generation_4: Json | null
          generation_5: Json | null
          highest_class: string | null
          horse_name: string
          horse_name_normalized: string | null
          id: string
          last_updated_at: string | null
          owner: string | null
          race_record: Json | null
          sales_history: Json | null
          search_count: number | null
          searched_by: string | null
          sex: string | null
          sire: string | null
          sire_dam: string | null
          sire_sire: string | null
          status: string | null
          trainer: string | null
          year_born: number | null
        }
        Insert: {
          best_distance?: string | null
          best_rating?: string | null
          best_surface?: string | null
          breeder?: string | null
          career_stats?: Json | null
          citations?: Json | null
          color?: string | null
          country?: string | null
          dam?: string | null
          dam_dam?: string | null
          dam_sire?: string | null
          first_searched_at?: string | null
          full_data?: Json | null
          generation_3?: Json | null
          generation_4?: Json | null
          generation_5?: Json | null
          highest_class?: string | null
          horse_name: string
          horse_name_normalized?: string | null
          id?: string
          last_updated_at?: string | null
          owner?: string | null
          race_record?: Json | null
          sales_history?: Json | null
          search_count?: number | null
          searched_by?: string | null
          sex?: string | null
          sire?: string | null
          sire_dam?: string | null
          sire_sire?: string | null
          status?: string | null
          trainer?: string | null
          year_born?: number | null
        }
        Update: {
          best_distance?: string | null
          best_rating?: string | null
          best_surface?: string | null
          breeder?: string | null
          career_stats?: Json | null
          citations?: Json | null
          color?: string | null
          country?: string | null
          dam?: string | null
          dam_dam?: string | null
          dam_sire?: string | null
          first_searched_at?: string | null
          full_data?: Json | null
          generation_3?: Json | null
          generation_4?: Json | null
          generation_5?: Json | null
          highest_class?: string | null
          horse_name?: string
          horse_name_normalized?: string | null
          id?: string
          last_updated_at?: string | null
          owner?: string | null
          race_record?: Json | null
          sales_history?: Json | null
          search_count?: number | null
          searched_by?: string | null
          sex?: string | null
          sire?: string | null
          sire_dam?: string | null
          sire_sire?: string | null
          status?: string | null
          trainer?: string | null
          year_born?: number | null
        }
        Relationships: []
      }
      horses: {
        Row: {
          breeder: string | null
          color: string | null
          country: string | null
          created_at: string | null
          dam: string | null
          dam_sire: string | null
          id: string
          is_stallion: boolean | null
          name: string
          owner: string | null
          pedigree_data: Json | null
          performance_data: Json | null
          sex: string | null
          sire: string | null
          slug: string | null
          stud_farm: string | null
          stud_fee: string | null
          trainer: string | null
          updated_at: string | null
          year_of_birth: number | null
        }
        Insert: {
          breeder?: string | null
          color?: string | null
          country?: string | null
          created_at?: string | null
          dam?: string | null
          dam_sire?: string | null
          id?: string
          is_stallion?: boolean | null
          name: string
          owner?: string | null
          pedigree_data?: Json | null
          performance_data?: Json | null
          sex?: string | null
          sire?: string | null
          slug?: string | null
          stud_farm?: string | null
          stud_fee?: string | null
          trainer?: string | null
          updated_at?: string | null
          year_of_birth?: number | null
        }
        Update: {
          breeder?: string | null
          color?: string | null
          country?: string | null
          created_at?: string | null
          dam?: string | null
          dam_sire?: string | null
          id?: string
          is_stallion?: boolean | null
          name?: string
          owner?: string | null
          pedigree_data?: Json | null
          performance_data?: Json | null
          sex?: string | null
          sire?: string | null
          slug?: string | null
          stud_farm?: string | null
          stud_fee?: string | null
          trainer?: string | null
          updated_at?: string | null
          year_of_birth?: number | null
        }
        Relationships: []
      }
      inspection_analyses: {
        Row: {
          buyer_notes: string | null
          consolidated_score: number | null
          created_at: string
          flag: string
          horse_category: Database["public"]["Enums"]["horse_inspection_category"]
          horse_name: string
          id: string
          lot_ref: string | null
          market_estimate: Json | null
          pedigree_annotations: Json | null
          pedigree_generated_at: string | null
          pedigree_insight: string | null
          pedigree_meta: Json | null
          pedigree_pdf_name: string | null
          pedigree_pdf_url: string | null
          pedigree_research: Json | null
          pedigree_summary: Json | null
          roi_projection: Json | null
          sale_context: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          buyer_notes?: string | null
          consolidated_score?: number | null
          created_at?: string
          flag?: string
          horse_category: Database["public"]["Enums"]["horse_inspection_category"]
          horse_name: string
          id?: string
          lot_ref?: string | null
          market_estimate?: Json | null
          pedigree_annotations?: Json | null
          pedigree_generated_at?: string | null
          pedigree_insight?: string | null
          pedigree_meta?: Json | null
          pedigree_pdf_name?: string | null
          pedigree_pdf_url?: string | null
          pedigree_research?: Json | null
          pedigree_summary?: Json | null
          roi_projection?: Json | null
          sale_context?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          buyer_notes?: string | null
          consolidated_score?: number | null
          created_at?: string
          flag?: string
          horse_category?: Database["public"]["Enums"]["horse_inspection_category"]
          horse_name?: string
          id?: string
          lot_ref?: string | null
          market_estimate?: Json | null
          pedigree_annotations?: Json | null
          pedigree_generated_at?: string | null
          pedigree_insight?: string | null
          pedigree_meta?: Json | null
          pedigree_pdf_name?: string | null
          pedigree_pdf_url?: string | null
          pedigree_research?: Json | null
          pedigree_summary?: Json | null
          roi_projection?: Json | null
          sale_context?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      inspection_blocks: {
        Row: {
          analysis_id: string
          attention_points: string[] | null
          biomechanics_image_url: string | null
          biomechanics_legend: Json | null
          block_score: number | null
          bloodstock_insight: string | null
          created_at: string
          file_urls: string[]
          id: string
          measurements_json: Json | null
          media_purpose: Database["public"]["Enums"]["inspection_media_purpose"]
          observations: string | null
          score_breakdown: Json | null
        }
        Insert: {
          analysis_id: string
          attention_points?: string[] | null
          biomechanics_image_url?: string | null
          biomechanics_legend?: Json | null
          block_score?: number | null
          bloodstock_insight?: string | null
          created_at?: string
          file_urls?: string[]
          id?: string
          measurements_json?: Json | null
          media_purpose: Database["public"]["Enums"]["inspection_media_purpose"]
          observations?: string | null
          score_breakdown?: Json | null
        }
        Update: {
          analysis_id?: string
          attention_points?: string[] | null
          biomechanics_image_url?: string | null
          biomechanics_legend?: Json | null
          block_score?: number | null
          bloodstock_insight?: string | null
          created_at?: string
          file_urls?: string[]
          id?: string
          measurements_json?: Json | null
          media_purpose?: Database["public"]["Enums"]["inspection_media_purpose"]
          observations?: string | null
          score_breakdown?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "inspection_blocks_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "inspection_analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          billing_cycle: string | null
          company_name: string | null
          created_at: string | null
          currency: string | null
          customer_email: string
          customer_id: string
          customer_name: string | null
          id: string
          invoice_number: string
          payment_method: string | null
          plan: string
          revolut_order_id: string | null
          status: string | null
          total_amount: number
          vat_amount: number | null
          vat_rate: number | null
        }
        Insert: {
          amount: number
          billing_cycle?: string | null
          company_name?: string | null
          created_at?: string | null
          currency?: string | null
          customer_email: string
          customer_id: string
          customer_name?: string | null
          id?: string
          invoice_number: string
          payment_method?: string | null
          plan: string
          revolut_order_id?: string | null
          status?: string | null
          total_amount: number
          vat_amount?: number | null
          vat_rate?: number | null
        }
        Update: {
          amount?: number
          billing_cycle?: string | null
          company_name?: string | null
          created_at?: string | null
          currency?: string | null
          customer_email?: string
          customer_id?: string
          customer_name?: string | null
          id?: string
          invoice_number?: string
          payment_method?: string | null
          plan?: string
          revolut_order_id?: string | null
          status?: string | null
          total_amount?: number
          vat_amount?: number | null
          vat_rate?: number | null
        }
        Relationships: []
      }
      marketplace_listings: {
        Row: {
          auction_sale_name: string | null
          bonus_schemes: string | null
          breed: string | null
          buyer_name: string | null
          category: string | null
          cob: string | null
          colour: string | null
          consignor_name: string | null
          country: string | null
          created_at: string
          created_by: string | null
          dam: string | null
          dam_sire: string | null
          date_of_birth: string | null
          description_html: string | null
          first_dam_notes_html: string | null
          guide_price: number | null
          horse_name: string
          id: string
          internal_notes: string | null
          offers_close_at: string | null
          pedigree_json: Json | null
          photos: string[] | null
          reference_code: string | null
          report_pdf_url: string | null
          repository_url: string | null
          sale_stage: string
          scoping_video_available: boolean
          second_dam_notes_html: string | null
          sex: string | null
          sire: string | null
          sire_notes_html: string | null
          sold_price: number | null
          status: string
          third_dam_notes_html: string | null
          updated_at: string
          video_url: string | null
          x_rays_available: boolean
        }
        Insert: {
          auction_sale_name?: string | null
          bonus_schemes?: string | null
          breed?: string | null
          buyer_name?: string | null
          category?: string | null
          cob?: string | null
          colour?: string | null
          consignor_name?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          dam?: string | null
          dam_sire?: string | null
          date_of_birth?: string | null
          description_html?: string | null
          first_dam_notes_html?: string | null
          guide_price?: number | null
          horse_name: string
          id?: string
          internal_notes?: string | null
          offers_close_at?: string | null
          pedigree_json?: Json | null
          photos?: string[] | null
          reference_code?: string | null
          report_pdf_url?: string | null
          repository_url?: string | null
          sale_stage?: string
          scoping_video_available?: boolean
          second_dam_notes_html?: string | null
          sex?: string | null
          sire?: string | null
          sire_notes_html?: string | null
          sold_price?: number | null
          status?: string
          third_dam_notes_html?: string | null
          updated_at?: string
          video_url?: string | null
          x_rays_available?: boolean
        }
        Update: {
          auction_sale_name?: string | null
          bonus_schemes?: string | null
          breed?: string | null
          buyer_name?: string | null
          category?: string | null
          cob?: string | null
          colour?: string | null
          consignor_name?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          dam?: string | null
          dam_sire?: string | null
          date_of_birth?: string | null
          description_html?: string | null
          first_dam_notes_html?: string | null
          guide_price?: number | null
          horse_name?: string
          id?: string
          internal_notes?: string | null
          offers_close_at?: string | null
          pedigree_json?: Json | null
          photos?: string[] | null
          reference_code?: string | null
          report_pdf_url?: string | null
          repository_url?: string | null
          sale_stage?: string
          scoping_video_available?: boolean
          second_dam_notes_html?: string | null
          sex?: string | null
          sire?: string | null
          sire_notes_html?: string | null
          sold_price?: number | null
          status?: string
          third_dam_notes_html?: string | null
          updated_at?: string
          video_url?: string | null
          x_rays_available?: boolean
        }
        Relationships: []
      }
      marketplace_offer_events: {
        Row: {
          created_at: string
          id: string
          listing_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
        }
        Relationships: []
      }
      marketplace_offers: {
        Row: {
          amount: number
          contact_number: string
          created_at: string
          email: string
          id: string
          ip_address: string | null
          is_genuine: boolean
          listing_id: string
          message: string | null
          offeror_initials: string
          offeror_name: string
        }
        Insert: {
          amount: number
          contact_number: string
          created_at?: string
          email: string
          id?: string
          ip_address?: string | null
          is_genuine?: boolean
          listing_id: string
          message?: string | null
          offeror_initials: string
          offeror_name: string
        }
        Update: {
          amount?: number
          contact_number?: string
          created_at?: string
          email?: string
          id?: string
          ip_address?: string | null
          is_genuine?: boolean
          listing_id?: string
          message?: string | null
          offeror_initials?: string
          offeror_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_offers_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_offers_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings_public"
            referencedColumns: ["id"]
          },
        ]
      }
      matings: {
        Row: {
          compatibility_score: number | null
          created_at: string | null
          estimated_value: number | null
          genetic_analysis: Json | null
          id: string
          mare_id: string | null
          recommendations: string[] | null
          stallion_id: string | null
          success_probability: number | null
          user_id: string
        }
        Insert: {
          compatibility_score?: number | null
          created_at?: string | null
          estimated_value?: number | null
          genetic_analysis?: Json | null
          id?: string
          mare_id?: string | null
          recommendations?: string[] | null
          stallion_id?: string | null
          success_probability?: number | null
          user_id: string
        }
        Update: {
          compatibility_score?: number | null
          created_at?: string | null
          estimated_value?: number | null
          genetic_analysis?: Json | null
          id?: string
          mare_id?: string | null
          recommendations?: string[] | null
          stallion_id?: string | null
          success_probability?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "matings_mare_id_fkey"
            columns: ["mare_id"]
            isOneToOne: false
            referencedRelation: "horses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matings_stallion_id_fkey"
            columns: ["stallion_id"]
            isOneToOne: false
            referencedRelation: "horses"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_leads: {
        Row: {
          created_at: string
          email: string
          id: string
          source_url: string | null
          subscribed_at: string
          type: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          source_url?: string | null
          subscribed_at?: string
          type?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          source_url?: string | null
          subscribed_at?: string
          type?: string
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          active: boolean | null
          email: string
          id: string
          name: string | null
          source: string | null
          subscribed_at: string | null
        }
        Insert: {
          active?: boolean | null
          email: string
          id?: string
          name?: string | null
          source?: string | null
          subscribed_at?: string | null
        }
        Update: {
          active?: boolean | null
          email?: string
          id?: string
          name?: string | null
          source?: string | null
          subscribed_at?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          account_type: string | null
          amount: number
          billing_cycle: string
          checkout_url: string | null
          country: string | null
          created_at: string | null
          currency: string
          id: string
          metadata: Json | null
          plan_id: string
          revolut_order_id: string | null
          status: string
          total_amount: number | null
          updated_at: string | null
          user_id: string
          vat_amount: number | null
          vat_number_used: string | null
          vat_rate: number | null
        }
        Insert: {
          account_type?: string | null
          amount?: number
          billing_cycle?: string
          checkout_url?: string | null
          country?: string | null
          created_at?: string | null
          currency?: string
          id?: string
          metadata?: Json | null
          plan_id: string
          revolut_order_id?: string | null
          status?: string
          total_amount?: number | null
          updated_at?: string | null
          user_id: string
          vat_amount?: number | null
          vat_number_used?: string | null
          vat_rate?: number | null
        }
        Update: {
          account_type?: string | null
          amount?: number
          billing_cycle?: string
          checkout_url?: string | null
          country?: string | null
          created_at?: string | null
          currency?: string
          id?: string
          metadata?: Json | null
          plan_id?: string
          revolut_order_id?: string | null
          status?: string
          total_amount?: number | null
          updated_at?: string | null
          user_id?: string
          vat_amount?: number | null
          vat_number_used?: string | null
          vat_rate?: number | null
        }
        Relationships: []
      }
      pdf_uploads: {
        Row: {
          created_at: string | null
          error_message: string | null
          extracted_data: Json | null
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          processed_at: string | null
          status: Database["public"]["Enums"]["report_status"] | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          extracted_data?: Json | null
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          processed_at?: string | null
          status?: Database["public"]["Enums"]["report_status"] | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          extracted_data?: Json | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          processed_at?: string | null
          status?: Database["public"]["Enums"]["report_status"] | null
          user_id?: string
        }
        Relationships: []
      }
      pedigrees: {
        Row: {
          center_of_distribution: number | null
          created_at: string | null
          dosage_index: number | null
          dosage_profile: string | null
          generation_1_dam: string | null
          generation_1_sire: string | null
          generation_2_dam_dam: string | null
          generation_2_dam_sire: string | null
          generation_2_sire_dam: string | null
          generation_2_sire_sire: string | null
          generation_3: Json | null
          generation_4: Json | null
          horse_id: string | null
          horse_name: string
          id: string
          inbreeding_coefficient: number | null
          inbreeding_patterns: string[] | null
        }
        Insert: {
          center_of_distribution?: number | null
          created_at?: string | null
          dosage_index?: number | null
          dosage_profile?: string | null
          generation_1_dam?: string | null
          generation_1_sire?: string | null
          generation_2_dam_dam?: string | null
          generation_2_dam_sire?: string | null
          generation_2_sire_dam?: string | null
          generation_2_sire_sire?: string | null
          generation_3?: Json | null
          generation_4?: Json | null
          horse_id?: string | null
          horse_name: string
          id?: string
          inbreeding_coefficient?: number | null
          inbreeding_patterns?: string[] | null
        }
        Update: {
          center_of_distribution?: number | null
          created_at?: string | null
          dosage_index?: number | null
          dosage_profile?: string | null
          generation_1_dam?: string | null
          generation_1_sire?: string | null
          generation_2_dam_dam?: string | null
          generation_2_dam_sire?: string | null
          generation_2_sire_dam?: string | null
          generation_2_sire_sire?: string | null
          generation_3?: Json | null
          generation_4?: Json | null
          horse_id?: string | null
          horse_name?: string
          id?: string
          inbreeding_coefficient?: number | null
          inbreeding_patterns?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "pedigrees_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses"
            referencedColumns: ["id"]
          },
        ]
      }
      pedigrees_full: {
        Row: {
          avg_distance_winners: string | null
          blood_percentages: Json | null
          center_of_distribution: number | null
          chefs_de_race: Json | null
          class_indicator: string | null
          confidence_score: number | null
          created_at: string | null
          dam: string | null
          dam_dam: string | null
          dam_dam_dam: string | null
          dam_dam_sire: string | null
          dam_line: string | null
          dam_sire: string | null
          dam_sire_dam: string | null
          dam_sire_sire: string | null
          dosage_index: number | null
          dosage_interpretation: string | null
          dosage_profile: string | null
          gen4: Json | null
          gen5: Json | null
          horse_id: string | null
          horse_name: string
          id: string
          inbreeding_coefficient: number | null
          inbreeding_patterns: string[] | null
          last_updated: string | null
          mr_prospector_percent: number | null
          native_dancer_percent: number | null
          nearco_percent: number | null
          nick_notes: string | null
          nick_rating: string | null
          northern_dancer_percent: number | null
          pedigree_sources: string[] | null
          sire: string | null
          sire_dam: string | null
          sire_dam_dam: string | null
          sire_dam_sire: string | null
          sire_line: string | null
          sire_sire: string | null
          sire_sire_dam: string | null
          sire_sire_sire: string | null
          surface_affinity: string | null
        }
        Insert: {
          avg_distance_winners?: string | null
          blood_percentages?: Json | null
          center_of_distribution?: number | null
          chefs_de_race?: Json | null
          class_indicator?: string | null
          confidence_score?: number | null
          created_at?: string | null
          dam?: string | null
          dam_dam?: string | null
          dam_dam_dam?: string | null
          dam_dam_sire?: string | null
          dam_line?: string | null
          dam_sire?: string | null
          dam_sire_dam?: string | null
          dam_sire_sire?: string | null
          dosage_index?: number | null
          dosage_interpretation?: string | null
          dosage_profile?: string | null
          gen4?: Json | null
          gen5?: Json | null
          horse_id?: string | null
          horse_name: string
          id?: string
          inbreeding_coefficient?: number | null
          inbreeding_patterns?: string[] | null
          last_updated?: string | null
          mr_prospector_percent?: number | null
          native_dancer_percent?: number | null
          nearco_percent?: number | null
          nick_notes?: string | null
          nick_rating?: string | null
          northern_dancer_percent?: number | null
          pedigree_sources?: string[] | null
          sire?: string | null
          sire_dam?: string | null
          sire_dam_dam?: string | null
          sire_dam_sire?: string | null
          sire_line?: string | null
          sire_sire?: string | null
          sire_sire_dam?: string | null
          sire_sire_sire?: string | null
          surface_affinity?: string | null
        }
        Update: {
          avg_distance_winners?: string | null
          blood_percentages?: Json | null
          center_of_distribution?: number | null
          chefs_de_race?: Json | null
          class_indicator?: string | null
          confidence_score?: number | null
          created_at?: string | null
          dam?: string | null
          dam_dam?: string | null
          dam_dam_dam?: string | null
          dam_dam_sire?: string | null
          dam_line?: string | null
          dam_sire?: string | null
          dam_sire_dam?: string | null
          dam_sire_sire?: string | null
          dosage_index?: number | null
          dosage_interpretation?: string | null
          dosage_profile?: string | null
          gen4?: Json | null
          gen5?: Json | null
          horse_id?: string | null
          horse_name?: string
          id?: string
          inbreeding_coefficient?: number | null
          inbreeding_patterns?: string[] | null
          last_updated?: string | null
          mr_prospector_percent?: number | null
          native_dancer_percent?: number | null
          nearco_percent?: number | null
          nick_notes?: string | null
          nick_rating?: string | null
          northern_dancer_percent?: number | null
          pedigree_sources?: string[] | null
          sire?: string | null
          sire_dam?: string | null
          sire_dam_dam?: string | null
          sire_dam_sire?: string | null
          sire_line?: string | null
          sire_sire?: string | null
          sire_sire_dam?: string | null
          sire_sire_sire?: string | null
          surface_affinity?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pedigrees_full_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_inquiries: {
        Row: {
          company_name: string
          created_at: string
          email: string
          full_name: string
          id: string
          plan_interest: string | null
          status: string
        }
        Insert: {
          company_name: string
          created_at?: string
          email: string
          full_name: string
          id?: string
          plan_interest?: string | null
          status?: string
        }
        Update: {
          company_name?: string
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          plan_interest?: string | null
          status?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_type: string | null
          analyses_limit: number
          analyses_remaining: number
          analyses_used: number
          company_name: string | null
          country: string | null
          created_at: string | null
          email: string
          first_name: string | null
          full_name: string | null
          id: string
          last_name: string | null
          plan: Database["public"]["Enums"]["user_plan"]
          plan_started_at: string | null
          updated_at: string | null
          user_id: string
          vat_number: string | null
        }
        Insert: {
          account_type?: string | null
          analyses_limit?: number
          analyses_remaining?: number
          analyses_used?: number
          company_name?: string | null
          country?: string | null
          created_at?: string | null
          email: string
          first_name?: string | null
          full_name?: string | null
          id: string
          last_name?: string | null
          plan?: Database["public"]["Enums"]["user_plan"]
          plan_started_at?: string | null
          updated_at?: string | null
          user_id: string
          vat_number?: string | null
        }
        Update: {
          account_type?: string | null
          analyses_limit?: number
          analyses_remaining?: number
          analyses_used?: number
          company_name?: string | null
          country?: string | null
          created_at?: string | null
          email?: string
          first_name?: string | null
          full_name?: string | null
          id?: string
          last_name?: string | null
          plan?: Database["public"]["Enums"]["user_plan"]
          plan_started_at?: string | null
          updated_at?: string | null
          user_id?: string
          vat_number?: string | null
        }
        Relationships: []
      }
      published_reports: {
        Row: {
          auction_house: string | null
          cover_image_url: string | null
          created_at: string | null
          description: string | null
          id: string
          pdf_url: string
          price: number | null
          published_at: string
          report_type: string
          title: string
          updated_at: string | null
        }
        Insert: {
          auction_house?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          pdf_url: string
          price?: number | null
          published_at?: string
          report_type: string
          title: string
          updated_at?: string | null
        }
        Update: {
          auction_house?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          pdf_url?: string
          price?: number | null
          published_at?: string
          report_type?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      race_results: {
        Row: {
          beyer_figure: number | null
          country: string | null
          created_at: string | null
          currency: string | null
          distance: string | null
          finish_position: number | null
          horse_id: string | null
          horse_name: string
          id: string
          jockey: string | null
          margin: string | null
          odds: string | null
          prize_money: number | null
          race_date: string | null
          race_grade: string | null
          race_name: string | null
          rpr: number | null
          runners: number | null
          source: string | null
          speed_rating: number | null
          surface: string | null
          time: string | null
          timeform_rating: number | null
          track: string | null
          trainer: string | null
          weight: string | null
        }
        Insert: {
          beyer_figure?: number | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          distance?: string | null
          finish_position?: number | null
          horse_id?: string | null
          horse_name: string
          id?: string
          jockey?: string | null
          margin?: string | null
          odds?: string | null
          prize_money?: number | null
          race_date?: string | null
          race_grade?: string | null
          race_name?: string | null
          rpr?: number | null
          runners?: number | null
          source?: string | null
          speed_rating?: number | null
          surface?: string | null
          time?: string | null
          timeform_rating?: number | null
          track?: string | null
          trainer?: string | null
          weight?: string | null
        }
        Update: {
          beyer_figure?: number | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          distance?: string | null
          finish_position?: number | null
          horse_id?: string | null
          horse_name?: string
          id?: string
          jockey?: string | null
          margin?: string | null
          odds?: string | null
          prize_money?: number | null
          race_date?: string | null
          race_grade?: string | null
          race_name?: string | null
          rpr?: number | null
          runners?: number | null
          source?: string | null
          speed_rating?: number | null
          surface?: string | null
          time?: string | null
          timeform_rating?: number | null
          track?: string | null
          trainer?: string | null
          weight?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "race_results_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses"
            referencedColumns: ["id"]
          },
        ]
      }
      races: {
        Row: {
          conditions: string | null
          created_at: string | null
          distance: number | null
          horse_id: string | null
          id: string
          position: number | null
          prize_money: number | null
          race_date: string
          race_type: string | null
          time_seconds: number | null
          track: string
        }
        Insert: {
          conditions?: string | null
          created_at?: string | null
          distance?: number | null
          horse_id?: string | null
          id?: string
          position?: number | null
          prize_money?: number | null
          race_date: string
          race_type?: string | null
          time_seconds?: number | null
          track: string
        }
        Update: {
          conditions?: string | null
          created_at?: string | null
          distance?: number | null
          horse_id?: string | null
          id?: string
          position?: number | null
          prize_money?: number | null
          race_date?: string
          race_type?: string | null
          time_seconds?: number | null
          track?: string
        }
        Relationships: [
          {
            foreignKeyName: "races_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses"
            referencedColumns: ["id"]
          },
        ]
      }
      report_purchases: {
        Row: {
          id: string
          price_paid: number
          purchased_at: string | null
          report_id: string
          user_id: string
        }
        Insert: {
          id?: string
          price_paid: number
          purchased_at?: string | null
          report_id: string
          user_id: string
        }
        Update: {
          id?: string
          price_paid?: number
          purchased_at?: string | null
          report_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_purchases_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "published_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          auction_house: string | null
          buyer: string | null
          created_at: string | null
          currency: string | null
          horse_id: string | null
          id: string
          sale_date: string
          sale_price: number | null
          sale_type: string | null
          seller: string | null
        }
        Insert: {
          auction_house?: string | null
          buyer?: string | null
          created_at?: string | null
          currency?: string | null
          horse_id?: string | null
          id?: string
          sale_date: string
          sale_price?: number | null
          sale_type?: string | null
          seller?: string | null
        }
        Update: {
          auction_house?: string | null
          buyer?: string | null
          created_at?: string | null
          currency?: string | null
          horse_id?: string | null
          id?: string
          sale_date?: string
          sale_price?: number | null
          sale_type?: string | null
          seller?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_history: {
        Row: {
          age_at_sale: string | null
          auction_house: string | null
          buyer: string | null
          consignor: string | null
          created_at: string | null
          currency: string | null
          dam: string | null
          horse_id: string | null
          horse_name: string | null
          id: string
          lot_number: string | null
          price: number | null
          price_usd: number | null
          sale_date: string | null
          sale_name: string
          sale_year: number | null
          seller: string | null
          session: string | null
          sex: string | null
          sire: string | null
          source: string | null
        }
        Insert: {
          age_at_sale?: string | null
          auction_house?: string | null
          buyer?: string | null
          consignor?: string | null
          created_at?: string | null
          currency?: string | null
          dam?: string | null
          horse_id?: string | null
          horse_name?: string | null
          id?: string
          lot_number?: string | null
          price?: number | null
          price_usd?: number | null
          sale_date?: string | null
          sale_name: string
          sale_year?: number | null
          seller?: string | null
          session?: string | null
          sex?: string | null
          sire?: string | null
          source?: string | null
        }
        Update: {
          age_at_sale?: string | null
          auction_house?: string | null
          buyer?: string | null
          consignor?: string | null
          created_at?: string | null
          currency?: string | null
          dam?: string | null
          horse_id?: string | null
          horse_name?: string | null
          id?: string
          lot_number?: string | null
          price?: number | null
          price_usd?: number | null
          sale_date?: string | null
          sale_name?: string
          sale_year?: number | null
          seller?: string | null
          session?: string | null
          sex?: string | null
          sire?: string | null
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_history_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses"
            referencedColumns: ["id"]
          },
        ]
      }
      search_cache: {
        Row: {
          claude_analysis: string | null
          expires_at: string | null
          horse_name: string | null
          id: string
          perplexity_raw_data: string | null
          search_date: string | null
          search_key: string | null
          search_query: string
          sources_used: string[] | null
        }
        Insert: {
          claude_analysis?: string | null
          expires_at?: string | null
          horse_name?: string | null
          id?: string
          perplexity_raw_data?: string | null
          search_date?: string | null
          search_key?: string | null
          search_query: string
          sources_used?: string[] | null
        }
        Update: {
          claude_analysis?: string | null
          expires_at?: string | null
          horse_name?: string | null
          id?: string
          perplexity_raw_data?: string | null
          search_date?: string | null
          search_key?: string | null
          search_query?: string
          sources_used?: string[] | null
        }
        Relationships: []
      }
      search_cache_v2: {
        Row: {
          cache_key: string
          created_at: string
          result: Json
        }
        Insert: {
          cache_key: string
          created_at?: string
          result: Json
        }
        Update: {
          cache_key?: string
          created_at?: string
          result?: Json
        }
        Relationships: []
      }
      search_history: {
        Row: {
          created_at: string | null
          id: string
          results_data: Json | null
          search_query: Json
          search_type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          results_data?: Json | null
          search_query: Json
          search_type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          results_data?: Json | null
          search_query?: Json
          search_type?: string
          user_id?: string
        }
        Relationships: []
      }
      sires: {
        Row: {
          average_earnings: number | null
          avg_sale_price: number | null
          avg_winning_distance: string | null
          aw_percent: number | null
          country: string | null
          created_at: string | null
          dam_of_sire: string | null
          dirt_percent: number | null
          id: string
          last_updated: string | null
          median_earnings: number | null
          median_sale_price: number | null
          name: string
          sire_of_sire: string | null
          stakes_winners: number | null
          stakes_winners_percent: number | null
          stud_farm: string | null
          stud_fee: string | null
          top_performers: Json | null
          top_sale_price: number | null
          total_runners: number | null
          total_winners: number | null
          turf_percent: number | null
          winners_percent: number | null
          year_born: number | null
        }
        Insert: {
          average_earnings?: number | null
          avg_sale_price?: number | null
          avg_winning_distance?: string | null
          aw_percent?: number | null
          country?: string | null
          created_at?: string | null
          dam_of_sire?: string | null
          dirt_percent?: number | null
          id?: string
          last_updated?: string | null
          median_earnings?: number | null
          median_sale_price?: number | null
          name: string
          sire_of_sire?: string | null
          stakes_winners?: number | null
          stakes_winners_percent?: number | null
          stud_farm?: string | null
          stud_fee?: string | null
          top_performers?: Json | null
          top_sale_price?: number | null
          total_runners?: number | null
          total_winners?: number | null
          turf_percent?: number | null
          winners_percent?: number | null
          year_born?: number | null
        }
        Update: {
          average_earnings?: number | null
          avg_sale_price?: number | null
          avg_winning_distance?: string | null
          aw_percent?: number | null
          country?: string | null
          created_at?: string | null
          dam_of_sire?: string | null
          dirt_percent?: number | null
          id?: string
          last_updated?: string | null
          median_earnings?: number | null
          median_sale_price?: number | null
          name?: string
          sire_of_sire?: string | null
          stakes_winners?: number | null
          stakes_winners_percent?: number | null
          stud_farm?: string | null
          stud_fee?: string | null
          top_performers?: Json | null
          top_sale_price?: number | null
          total_runners?: number | null
          total_winners?: number | null
          turf_percent?: number | null
          winners_percent?: number | null
          year_born?: number | null
        }
        Relationships: []
      }
      stallions: {
        Row: {
          created_at: string | null
          farm: string | null
          horse_id: string | null
          id: string
          stakes_winners: number | null
          standing_location: string | null
          statistics: Json | null
          stud_fee: number | null
          stud_fee_currency: string | null
          success_rate: number | null
          total_progeny: number | null
          updated_at: string | null
          winners: number | null
        }
        Insert: {
          created_at?: string | null
          farm?: string | null
          horse_id?: string | null
          id?: string
          stakes_winners?: number | null
          standing_location?: string | null
          statistics?: Json | null
          stud_fee?: number | null
          stud_fee_currency?: string | null
          success_rate?: number | null
          total_progeny?: number | null
          updated_at?: string | null
          winners?: number | null
        }
        Update: {
          created_at?: string | null
          farm?: string | null
          horse_id?: string | null
          id?: string
          stakes_winners?: number | null
          standing_location?: string | null
          statistics?: Json | null
          stud_fee?: number | null
          stud_fee_currency?: string | null
          success_rate?: number | null
          total_progeny?: number | null
          updated_at?: string | null
          winners?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stallions_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          billing_cycle: string
          cancelled_at: string | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_id: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          billing_cycle?: string
          cancelled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id?: string
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          billing_cycle?: string
          cancelled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      training_gps_reports: {
        Row: {
          created_at: string
          id: string
          metrics: Json
          provider: string | null
          raw_filename: string | null
          session_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          metrics?: Json
          provider?: string | null
          raw_filename?: string | null
          session_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          metrics?: Json
          provider?: string | null
          raw_filename?: string | null
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_gps_reports_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      training_horses: {
        Row: {
          age: number | null
          breed: string | null
          country: string | null
          created_at: string
          dam: string | null
          dam_sire: string | null
          id: string
          name: string
          notes: string | null
          owner: string | null
          photo_url: string | null
          racing_code: string | null
          sex: string | null
          sire: string | null
          stable: string | null
          status: string | null
          trainer: string | null
          training_centre: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          age?: number | null
          breed?: string | null
          country?: string | null
          created_at?: string
          dam?: string | null
          dam_sire?: string | null
          id?: string
          name: string
          notes?: string | null
          owner?: string | null
          photo_url?: string | null
          racing_code?: string | null
          sex?: string | null
          sire?: string | null
          stable?: string | null
          status?: string | null
          trainer?: string | null
          training_centre?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          age?: number | null
          breed?: string | null
          country?: string | null
          created_at?: string
          dam?: string | null
          dam_sire?: string | null
          id?: string
          name?: string
          notes?: string | null
          owner?: string | null
          photo_url?: string | null
          racing_code?: string | null
          sex?: string | null
          sire?: string | null
          stable?: string | null
          status?: string | null
          trainer?: string | null
          training_centre?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      training_reports: {
        Row: {
          created_at: string
          file_url: string | null
          horse_id: string
          id: string
          payload: Json | null
          report_type: string
          title: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          file_url?: string | null
          horse_id: string
          id?: string
          payload?: Json | null
          report_type: string
          title?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          file_url?: string | null
          horse_id?: string
          id?: string
          payload?: Json | null
          report_type?: string
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_reports_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "training_horses"
            referencedColumns: ["id"]
          },
        ]
      }
      training_sessions: {
        Row: {
          body_weight_kg: number | null
          created_at: string
          distance_m: number | null
          exercise_type: string | null
          gps_file_url: string | null
          ground_condition: string | null
          horse_id: string
          id: string
          location: string | null
          resting_heart_rate: number | null
          rider: string | null
          session_date: string
          status: string
          surface: string | null
          temperature_c: number | null
          trainer_notes: string | null
          updated_at: string
          user_id: string
          vet_notes: string | null
          video_url: string | null
          weather: string | null
        }
        Insert: {
          body_weight_kg?: number | null
          created_at?: string
          distance_m?: number | null
          exercise_type?: string | null
          gps_file_url?: string | null
          ground_condition?: string | null
          horse_id: string
          id?: string
          location?: string | null
          resting_heart_rate?: number | null
          rider?: string | null
          session_date?: string
          status?: string
          surface?: string | null
          temperature_c?: number | null
          trainer_notes?: string | null
          updated_at?: string
          user_id: string
          vet_notes?: string | null
          video_url?: string | null
          weather?: string | null
        }
        Update: {
          body_weight_kg?: number | null
          created_at?: string
          distance_m?: number | null
          exercise_type?: string | null
          gps_file_url?: string | null
          ground_condition?: string | null
          horse_id?: string
          id?: string
          location?: string | null
          resting_heart_rate?: number | null
          rider?: string | null
          session_date?: string
          status?: string
          surface?: string | null
          temperature_c?: number | null
          trainer_notes?: string | null
          updated_at?: string
          user_id?: string
          vet_notes?: string | null
          video_url?: string | null
          weather?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_sessions_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "training_horses"
            referencedColumns: ["id"]
          },
        ]
      }
      training_video_analyses: {
        Row: {
          ai_narrative: string | null
          created_at: string
          id: string
          metrics: Json
          recommendations: Json | null
          scores: Json
          session_id: string
          source: string | null
          user_id: string
        }
        Insert: {
          ai_narrative?: string | null
          created_at?: string
          id?: string
          metrics?: Json
          recommendations?: Json | null
          scores?: Json
          session_id: string
          source?: string | null
          user_id: string
        }
        Update: {
          ai_narrative?: string | null
          created_at?: string
          id?: string
          metrics?: Json
          recommendations?: Json | null
          scores?: Json
          session_id?: string
          source?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_video_analyses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_tracking: {
        Row: {
          action: string | null
          analyses_allowed: number
          analyses_used: number
          balance_after: number | null
          created_at: string | null
          credits_delta: number | null
          expiry_date: string | null
          id: string
          page_used: string | null
          payment_type: string | null
          period_end: string | null
          period_start: string | null
          plan: string
          revolut_payment_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          action?: string | null
          analyses_allowed?: number
          analyses_used?: number
          balance_after?: number | null
          created_at?: string | null
          credits_delta?: number | null
          expiry_date?: string | null
          id?: string
          page_used?: string | null
          payment_type?: string | null
          period_end?: string | null
          period_start?: string | null
          plan?: string
          revolut_payment_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          action?: string | null
          analyses_allowed?: number
          analyses_used?: number
          balance_after?: number | null
          created_at?: string | null
          credits_delta?: number | null
          expiry_date?: string | null
          id?: string
          page_used?: string | null
          payment_type?: string | null
          period_end?: string | null
          period_start?: string | null
          plan?: string
          revolut_payment_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_catalog_access: {
        Row: {
          accessed_at: string
          catalog_id: string
          id: string
          user_id: string
        }
        Insert: {
          accessed_at?: string
          catalog_id: string
          id?: string
          user_id: string
        }
        Update: {
          accessed_at?: string
          catalog_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_catalog_access_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "catalogues"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      free_users_exhausted: {
        Row: {
          analyses_remaining: number | null
          analyses_used: number | null
          email: string | null
          plan_started_at: string | null
        }
        Insert: {
          analyses_remaining?: number | null
          analyses_used?: number | null
          email?: string | null
          plan_started_at?: string | null
        }
        Update: {
          analyses_remaining?: number | null
          analyses_used?: number | null
          email?: string | null
          plan_started_at?: string | null
        }
        Relationships: []
      }
      marketplace_listings_public: {
        Row: {
          auction_sale_name: string | null
          bonus_schemes: string | null
          breed: string | null
          category: string | null
          cob: string | null
          colour: string | null
          consignor_name: string | null
          country: string | null
          created_at: string | null
          created_by: string | null
          dam: string | null
          dam_sire: string | null
          date_of_birth: string | null
          description_html: string | null
          first_dam_notes_html: string | null
          guide_price: number | null
          horse_name: string | null
          id: string | null
          offers_close_at: string | null
          pedigree_json: Json | null
          photos: string[] | null
          reference_code: string | null
          report_pdf_url: string | null
          repository_url: string | null
          sale_stage: string | null
          scoping_video_available: boolean | null
          second_dam_notes_html: string | null
          sex: string | null
          sire: string | null
          sire_notes_html: string | null
          status: string | null
          third_dam_notes_html: string | null
          updated_at: string | null
          video_url: string | null
          x_rays_available: boolean | null
        }
        Insert: {
          auction_sale_name?: string | null
          bonus_schemes?: string | null
          breed?: string | null
          category?: string | null
          cob?: string | null
          colour?: string | null
          consignor_name?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          dam?: string | null
          dam_sire?: string | null
          date_of_birth?: string | null
          description_html?: string | null
          first_dam_notes_html?: string | null
          guide_price?: number | null
          horse_name?: string | null
          id?: string | null
          offers_close_at?: string | null
          pedigree_json?: Json | null
          photos?: string[] | null
          reference_code?: string | null
          report_pdf_url?: string | null
          repository_url?: string | null
          sale_stage?: string | null
          scoping_video_available?: boolean | null
          second_dam_notes_html?: string | null
          sex?: string | null
          sire?: string | null
          sire_notes_html?: string | null
          status?: string | null
          third_dam_notes_html?: string | null
          updated_at?: string | null
          video_url?: string | null
          x_rays_available?: boolean | null
        }
        Update: {
          auction_sale_name?: string | null
          bonus_schemes?: string | null
          breed?: string | null
          category?: string | null
          cob?: string | null
          colour?: string | null
          consignor_name?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          dam?: string | null
          dam_sire?: string | null
          date_of_birth?: string | null
          description_html?: string | null
          first_dam_notes_html?: string | null
          guide_price?: number | null
          horse_name?: string | null
          id?: string | null
          offers_close_at?: string | null
          pedigree_json?: Json | null
          photos?: string[] | null
          reference_code?: string | null
          report_pdf_url?: string | null
          repository_url?: string | null
          sale_stage?: string | null
          scoping_video_available?: boolean | null
          second_dam_notes_html?: string | null
          sex?: string | null
          sire?: string | null
          sire_notes_html?: string | null
          status?: string | null
          third_dam_notes_html?: string | null
          updated_at?: string | null
          video_url?: string | null
          x_rays_available?: boolean | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_db_stats: { Args: never; Returns: Json }
      get_public_offers: {
        Args: { _listing_id: string }
        Returns: {
          amount: number
          created_at: string
          id: string
          listing_id: string
          offeror_initials: string
        }[]
      }
      get_user_role: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_catalogue_lots: {
        Args: { amount: number; cat_id: string }
        Returns: undefined
      }
      increment_processed_lots: {
        Args: { amount: number; catalogue_id_input: string }
        Returns: undefined
      }
      use_analysis_credit: { Args: { p_user_id: string }; Returns: boolean }
    }
    Enums: {
      analysis_type:
        | "pedigree"
        | "performance"
        | "mating"
        | "broodmare"
        | "market"
      app_role: "admin" | "user" | "free_user" | "premium_user" | "super_admin"
      horse_inspection_category:
        | "FOAL"
        | "YEARLING"
        | "FLAT_IN_TRAINING"
        | "NH_STORE_YOUNG"
        | "NH_IN_TRAINING"
        | "BROODMARE_STALLION"
      inspection_media_purpose:
        | "STATIC_CONFORMATION"
        | "GAIT_WALK"
        | "GAIT_TROT"
        | "HOOF_DETAIL"
        | "MUSCULATURE"
        | "FULL_BODY_VIDEO"
      report_status: "pending" | "processing" | "completed" | "failed"
      user_plan: "free" | "starter" | "pro" | "enterprise"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      analysis_type: [
        "pedigree",
        "performance",
        "mating",
        "broodmare",
        "market",
      ],
      app_role: ["admin", "user", "free_user", "premium_user", "super_admin"],
      horse_inspection_category: [
        "FOAL",
        "YEARLING",
        "FLAT_IN_TRAINING",
        "NH_STORE_YOUNG",
        "NH_IN_TRAINING",
        "BROODMARE_STALLION",
      ],
      inspection_media_purpose: [
        "STATIC_CONFORMATION",
        "GAIT_WALK",
        "GAIT_TROT",
        "HOOF_DETAIL",
        "MUSCULATURE",
        "FULL_BODY_VIDEO",
      ],
      report_status: ["pending", "processing", "completed", "failed"],
      user_plan: ["free", "starter", "pro", "enterprise"],
    },
  },
} as const
