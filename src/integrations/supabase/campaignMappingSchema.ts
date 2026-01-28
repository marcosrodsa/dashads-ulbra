/**
 * Types for Campaign Mapping (De/Para) module
 */

// --- Tabela dim_campaign_mapping ---
export interface CampaignMapping {
    id: string;
    platform: "META" | "GOOGLE";
    campaign_id: string;
    campaign_name: string | null;
    unit_id: string | null;
    course_id: string | null;
    observation: string | null;
    is_ignored: boolean;
    updated_at: string;
    updated_by: string | null;
}

export type CampaignMappingInsert = Omit<CampaignMapping, "id" | "updated_at">;
export type CampaignMappingUpdate = Partial<CampaignMappingInsert>;

// --- Campanhas Agregadas (para listagem) ---
export interface AggregatedCampaign {
    platform: string;
    campaign_id: string;
    campaign_name: string | null;
    total_spend: number;
    // Dados do mapeamento (se existir)
    mapping_id: string | null;
    unit_id: string | null;
    unit_name: string | null;
    course_id: string | null;
    course_name: string | null;
    observation: string | null;
    is_ignored: boolean;
}

// --- Tabelas de Domínio ---
export interface Unit {
    id: string;
    name: string;
}

export interface Course {
    id: string;
    name: string;
    course_line_id?: string; // Optional but recommended for consistency
}

export interface CourseLine {
    id: string;
    name: string;
    status: string;
}

// --- Filtros da Página ---
export type MappingStatus = "pending" | "mapped" | "all";
export type PlatformFilter = "all" | "META" | "GOOGLE";

export interface CampaignClassifierFilters {
    status: MappingStatus;
    platform: PlatformFilter;
    search: string;
}
