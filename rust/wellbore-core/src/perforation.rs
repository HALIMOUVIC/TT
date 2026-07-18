use crate::types::{PerforationZone, WellData};

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PerforationFields {
    pub height: f64,
    pub shots: Option<f64>,
}

pub fn calculate_perforation_fields(
    top: f64,
    bottom: f64,
    manual_height: Option<f64>,
    density: Option<f64>,
    manual_shots: Option<f64>,
) -> PerforationFields {
    let height = if let Some(h) = manual_height {
        if h > 0.0 {
            (h * 100.0).round() / 100.0
        } else {
            ((bottom - top).abs() * 100.0).round() / 100.0
        }
    } else {
        ((bottom - top).abs() * 100.0).round() / 100.0
    };

    let shots = manual_shots.or_else(|| density.map(|d| ((height * d) * 100.0).round() / 100.0));

    PerforationFields { height, shots }
}

pub fn save_perforation(
    well: &WellData,
    new_perf: &PerforationZone,
    editing_perf_id: Option<&str>,
) -> WellData {
    let top = new_perf.top_depth;
    let bottom = new_perf.bottom_depth;
    let fields = calculate_perforation_fields(
        top,
        bottom,
        Some(new_perf.height),
        new_perf.density,
        new_perf.shots,
    );

    let mut updated = well.clone();
    if let Some(id) = editing_perf_id {
        updated.perforations = updated
            .perforations
            .iter()
            .map(|p| {
                if p.id == id {
                    PerforationZone {
                        id: p.id.clone(),
                        top_depth: top,
                        bottom_depth: bottom,
                        height: fields.height,
                        perfo_type: new_perf.perfo_type.clone(),
                        diameter: new_perf.diameter.clone(),
                        density: new_perf.density,
                        shots: fields.shots,
                        observations: new_perf.observations.clone(),
                        calage: new_perf.calage.clone(),
                    }
                } else {
                    p.clone()
                }
            })
            .collect();
    } else {
        let entry = PerforationZone {
            id: format!("perf-{}", chrono_now_millis()),
            top_depth: top,
            bottom_depth: bottom,
            height: fields.height,
            perfo_type: new_perf.perfo_type.clone(),
            diameter: new_perf.diameter.clone(),
            density: new_perf.density,
            shots: fields.shots,
            observations: new_perf.observations.clone(),
            calage: new_perf.calage.clone(),
        };
        updated.perforations.push(entry);
    }
    updated.updated_at = chrono_now_iso();
    updated
}

pub fn remove_perforation_from_well(well: &WellData, id: &str) -> WellData {
    let mut updated = well.clone();
    updated.perforations.retain(|p| p.id != id);
    updated.updated_at = chrono_now_iso();
    updated
}

fn chrono_now_millis() -> u128 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0)
}

fn chrono_now_iso() -> String {
    chrono_now_millis().to_string()
}
