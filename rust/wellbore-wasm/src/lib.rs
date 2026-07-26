use wasm_bindgen::prelude::*;
use wellbore_core::{
    active_casing_radius_at_depth, calculate_cote_products, calculate_max_depth, calculate_perforation_fields,
    compute_schematic, compute_schematic_full, get_filtered_tubings, parse_size_str,
    recalculate_bottom_depths, remove_perforation_from_well, save_perforation,
    update_tubing_component_matrix, CasingDrawData, CustomToolTypeRow, PerforationZone, ScaleMode,
    SchematicComputeInput, SchematicLayout, SchematicLayoutInput, WellData,
};

#[wasm_bindgen]
pub fn wasm_parse_size_to_number(size: &str) -> f64 {
    parse_size_str(size)
}

#[wasm_bindgen]
pub fn wasm_calculate_max_depth(well_json: &str) -> f64 {
    let well: WellData = serde_json::from_str(well_json).unwrap_or_default();
    calculate_max_depth(&well)
}

#[wasm_bindgen]
pub fn wasm_compute_schematic(input_json: &str) -> String {
    let input: SchematicComputeInput = match serde_json::from_str(input_json) {
        Ok(v) => v,
        Err(err) => return serde_json::json!({ "error": err.to_string() }).to_string(),
    };
    let output = compute_schematic(&input);
    serde_json::to_string(&output).unwrap_or_else(|err| {
        serde_json::json!({ "error": err.to_string() }).to_string()
    })
}

#[wasm_bindgen]
pub fn wasm_recalculate_bottom_depths(tubings_json: &str) -> String {
    let tubings: Vec<wellbore_core::TubingComponent> =
        serde_json::from_str(tubings_json).unwrap_or_default();
    let updated = recalculate_bottom_depths(&tubings);
    serde_json::to_string(&updated).unwrap_or_else(|_| "[]".to_string())
}

#[wasm_bindgen]
pub fn wasm_calculate_cote_products(tubings_json: &str, spool_prod: &str) -> String {
    let tubings: Vec<wellbore_core::TubingComponent> =
        serde_json::from_str(tubings_json).unwrap_or_default();
    let result = calculate_cote_products(&tubings, Some(spool_prod));
    serde_json::to_string(&result).unwrap_or_else(|_| "[]".to_string())
}

#[wasm_bindgen]
pub fn wasm_calculate_perforation_fields(
    top: f64,
    bottom: f64,
    manual_height: f64,
    density: f64,
    manual_shots: f64,
    has_manual_height: bool,
    has_density: bool,
    has_manual_shots: bool,
) -> String {
    let fields = calculate_perforation_fields(
        top,
        bottom,
        if has_manual_height { Some(manual_height) } else { None },
        if has_density { Some(density) } else { None },
        if has_manual_shots { Some(manual_shots) } else { None },
    );
    serde_json::to_string(&fields).unwrap_or_else(|_| "{}".to_string())
}

#[wasm_bindgen]
pub fn wasm_save_perforation(
    well_json: &str,
    perf_json: &str,
    editing_perf_id: &str,
) -> String {
    let well: WellData = serde_json::from_str(well_json).unwrap_or_default();
    let perf: PerforationZone = serde_json::from_str(perf_json).unwrap_or_default();
    let editing = if editing_perf_id.is_empty() {
        None
    } else {
        Some(editing_perf_id)
    };
    let updated = save_perforation(&well, &perf, editing);
    serde_json::to_string(&updated).unwrap_or_else(|_| well_json.to_string())
}

#[wasm_bindgen]
pub fn wasm_remove_perforation(well_json: &str, perf_id: &str) -> String {
    let well: WellData = serde_json::from_str(well_json).unwrap_or_default();
    let updated = remove_perforation_from_well(&well, perf_id);
    serde_json::to_string(&updated).unwrap_or_else(|_| well_json.to_string())
}

#[wasm_bindgen]
pub fn wasm_update_tool_matrix(rows_json: &str) -> String {
    let rows: Vec<CustomToolTypeRow> = serde_json::from_str(rows_json).unwrap_or_default();
    let matrix = update_tubing_component_matrix(&rows);
    serde_json::to_string(&matrix).unwrap_or_else(|_| "{}".to_string())
}

#[wasm_bindgen]
pub fn wasm_get_filtered_tubings(tubings_json: &str) -> String {
    let tubings: Vec<wellbore_core::TubingComponent> =
        serde_json::from_str(tubings_json).unwrap_or_default();
    let filtered = get_filtered_tubings(&tubings);
    serde_json::to_string(&filtered).unwrap_or_else(|_| "[]".to_string())
}

#[wasm_bindgen]
pub fn wasm_default_layout(mode: &str) -> String {
    let layout = match mode {
        "print" => SchematicLayout::print(),
        _ => SchematicLayout::interactive(),
    };
    serde_json::to_string(&layout).unwrap_or_else(|_| "{}".to_string())
}

#[wasm_bindgen]
pub fn wasm_default_scale_mode(mode: &str) -> String {
    let scale = match mode {
        "linear" => ScaleMode::Linear,
        _ => ScaleMode::Compact,
    };
    serde_json::to_string(&scale).unwrap_or_else(|_| "\"compact\"".to_string())
}

#[wasm_bindgen]
pub fn wasm_compute_schematic_full(input_json: &str) -> String {
    let input: SchematicLayoutInput = match serde_json::from_str(input_json) {
        Ok(v) => v,
        Err(err) => return serde_json::json!({ "error": err.to_string() }).to_string(),
    };
    let output = compute_schematic_full(&input);
    serde_json::to_string(&output).unwrap_or_else(|err| {
        serde_json::json!({ "error": err.to_string() }).to_string()
    })
}

#[wasm_bindgen]
pub fn wasm_active_casing_radius(well_json: &str, casings_json: &str, depth: f64) -> f64 {
    let well: WellData = serde_json::from_str(well_json).unwrap_or_default();
    let casings: Vec<CasingDrawData> = serde_json::from_str(casings_json).unwrap_or_default();
    active_casing_radius_at_depth(&well, &casings, depth)
}

#[wasm_bindgen]
pub fn wasm_version() -> String {
    "0.1.0".to_string()
}
