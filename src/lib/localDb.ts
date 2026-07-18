import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

let db: Database.Database;

export function initDb(userDataPath: string): Database.Database {
  const dbDir = userDataPath;
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

  const dbPath = path.join(dbDir, "base.db");
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY,
      matricule TEXT,
      nom_prenom TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      password TEXT,
      d_rec TEXT,
      d_f_contrat TEXT,
      personnel TEXT,
      fonction TEXT,
      observation TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      t_combinaison TEXT,
      t_blouson TEXT,
      t_pantalon TEXT,
      t_parka TEXT,
      t_pantalon_ord TEXT,
      t_chemise_ord TEXT,
      t_tshirt_ord TEXT,
      t_pull TEXT,
      p_chaussure TEXT,
      t_veste_cuire TEXT,
      service TEXT
    );

    CREATE TABLE IF NOT EXISTS wells (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      purpose TEXT DEFAULT 'Oil Producer',
      completion_type TEXT DEFAULT 'COMPLETION SIMPLE',
      reservoir TEXT,
      field TEXT,
      elevation_sol REAL DEFAULT 0,
      elevation_forage REAL DEFAULT 0,
      elevation_production REAL DEFAULT 0,
      spool_prod TEXT,
      packer_type TEXT,
      susp_tbg TEXT,
      etan_tbg TEXT,
      origine_cotes TEXT,
      xmas_tree_brand TEXT,
      xmas_tree_type TEXT,
      xmas_tree_ract_sup TEXT,
      xmas_tree_pressure TEXT,
      xmas_tree_attache_tbg TEXT,
      xmas_tree_embase TEXT,
      xmas_tree_reduction TEXT,
      xmas_tree_olive TEXT,
      vannes_sas_marque TEXT,
      vannes_sas_nombre TEXT,
      vannes_sas_serie TEXT,
      vannes_maitresse_marque TEXT,
      vannes_maitresse_nombre TEXT,
      vannes_maitresse_serie TEXT,
      vannes_lat_tbg_marque TEXT,
      vannes_lat_tbg_nombre TEXT,
      vannes_lat_tbg_serie TEXT,
      vannes_lat_csg_marque TEXT,
      vannes_lat_csg_nombre TEXT,
      vannes_lat_csg_serie TEXT,
      observations TEXT,
      folio TEXT,
      folio_to_cancel TEXT,
      prod_tbg_od TEXT,
      prod_tbg_grade TEXT,
      prod_tbg_weight TEXT,
      updated_date TEXT,
      end_operation_date TEXT,
      vu_by TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS casing_strings (
      id TEXT PRIMARY KEY,
      well_id TEXT NOT NULL REFERENCES wells(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      borehole_size TEXT NOT NULL,
      casing_size TEXT NOT NULL,
      top_depth REAL NOT NULL DEFAULT 0,
      shoe_depth REAL NOT NULL,
      drilled_depth REAL NOT NULL,
      top_of_cement REAL,
      top_of_liner REAL,
      grade TEXT,
      weight REAL,
      connection TEXT,
      observations TEXT,
      display_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tubing_components (
      id TEXT PRIMARY KEY,
      well_id TEXT NOT NULL REFERENCES wells(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'Tubing',
      od TEXT NOT NULL,
      length REAL NOT NULL,
      bottom_depth REAL NOT NULL,
      is_cote_product_added INTEGER DEFAULT 0,
      observations TEXT,
      qty TEXT,
      custom_type TEXT,
      min_id TEXT,
      display_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS perforation_zones (
      id TEXT PRIMARY KEY,
      well_id TEXT NOT NULL REFERENCES wells(id) ON DELETE CASCADE,
      top_depth REAL NOT NULL,
      bottom_depth REAL NOT NULL,
      height REAL,
      perfo_type TEXT,
      diameter TEXT,
      density REAL,
      shots REAL,
      observations TEXT,
      calage TEXT,
      display_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS custom_tool_types (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL UNIQUE,
      default_name TEXT NOT NULL,
      default_od TEXT DEFAULT '2''7/8',
      default_custom_type TEXT DEFAULT 'EU',
      default_min_id TEXT DEFAULT '',
      french_designation TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS well_history (
      id TEXT PRIMARY KEY,
      well_id TEXT NOT NULL REFERENCES wells(id) ON DELETE CASCADE,
      folio TEXT NOT NULL,
      snapshot TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(well_id, folio)
    );

    CREATE TABLE IF NOT EXISTS sync_meta (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  return db;
}

export function getDb(): Database.Database {
  if (!db) throw new Error("Database not initialized. Call initDb() first.");
  return db;
}

// ─── Sync helpers ─────────────────────────────────────────────────────────────

export function wasEverSynced(): boolean {
  const d = getDb();
  const row = d.prepare("SELECT value FROM sync_meta WHERE key = 'synced'").get() as any;
  return row?.value === "true";
}

export function markSynced(): void {
  getDb().prepare("INSERT OR REPLACE INTO sync_meta (key, value) VALUES ('synced', 'true')").run();
}

export function upsertEmployee(emp: any): void {
  const d = getDb();
  const cols = Object.keys(emp).join(", ");
  const vals = Object.keys(emp).map(k => `@${k}`).join(", ");
  const updates = Object.keys(emp).filter(k => k !== "id").map(k => `${k} = excluded.${k}`).join(", ");
  d.prepare(`INSERT INTO employees (${cols}) VALUES (${vals}) ON CONFLICT(id) DO UPDATE SET ${updates}`).run(emp);
}

export function upsertWell(w: any): void {
  const d = getDb();
  const cols = Object.keys(w).join(", ");
  const vals = Object.keys(w).map(k => `@${k}`).join(", ");
  const updates = Object.keys(w).filter(k => k !== "id").map(k => `${k} = excluded.${k}`).join(", ");
  d.prepare(`INSERT INTO wells (${cols}) VALUES (${vals}) ON CONFLICT(id) DO UPDATE SET ${updates}`).run(w);
}

export function upsertCasing(c: any): void {
  const d = getDb();
  d.prepare(`
    INSERT INTO casing_strings (id,well_id,name,borehole_size,casing_size,top_depth,shoe_depth,drilled_depth,top_of_cement,top_of_liner,grade,weight,connection,observations,display_order)
    VALUES (@id,@well_id,@name,@borehole_size,@casing_size,@top_depth,@shoe_depth,@drilled_depth,@top_of_cement,@top_of_liner,@grade,@weight,@connection,@observations,@display_order)
    ON CONFLICT(id) DO UPDATE SET
      name=excluded.name, borehole_size=excluded.borehole_size, casing_size=excluded.casing_size,
      top_depth=excluded.top_depth, shoe_depth=excluded.shoe_depth, drilled_depth=excluded.drilled_depth,
      top_of_cement=excluded.top_of_cement, top_of_liner=excluded.top_of_liner, grade=excluded.grade,
      weight=excluded.weight, connection=excluded.connection, observations=excluded.observations, display_order=excluded.display_order
  `).run({ ...c, top_of_cement: c.top_of_cement ?? null, top_of_liner: c.top_of_liner ?? null });
}

export function upsertTubing(t: any): void {
  const d = getDb();
  d.prepare(`
    INSERT INTO tubing_components (id,well_id,name,type,od,length,bottom_depth,is_cote_product_added,observations,qty,custom_type,min_id,display_order)
    VALUES (@id,@well_id,@name,@type,@od,@length,@bottom_depth,@is_cote_product_added,@observations,@qty,@custom_type,@min_id,@display_order)
    ON CONFLICT(id) DO UPDATE SET
      name=excluded.name, type=excluded.type, od=excluded.od, length=excluded.length,
      bottom_depth=excluded.bottom_depth, is_cote_product_added=excluded.is_cote_product_added,
      observations=excluded.observations, qty=excluded.qty, custom_type=excluded.custom_type,
      min_id=excluded.min_id, display_order=excluded.display_order
  `).run({ ...t, is_cote_product_added: t.is_cote_product_added ? 1 : 0 });
}

export function upsertPerforation(p: any): void {
  const d = getDb();
  d.prepare(`
    INSERT INTO perforation_zones (id,well_id,top_depth,bottom_depth,perfo_type,diameter,density,shots,observations,calage,display_order)
    VALUES (@id,@well_id,@top_depth,@bottom_depth,@perfo_type,@diameter,@density,@shots,@observations,@calage,@display_order)
    ON CONFLICT(id) DO UPDATE SET
      top_depth=excluded.top_depth, bottom_depth=excluded.bottom_depth, perfo_type=excluded.perfo_type,
      diameter=excluded.diameter, density=excluded.density, shots=excluded.shots,
      observations=excluded.observations, calage=excluded.calage, display_order=excluded.display_order
  `).run(p);
}

export function upsertToolType(t: any): void {
  getDb().prepare(`
    INSERT INTO custom_tool_types (id,type,default_name,default_od,default_custom_type,default_min_id,french_designation)
    VALUES (@id,@type,@default_name,@default_od,@default_custom_type,@default_min_id,@french_designation)
    ON CONFLICT(type) DO UPDATE SET
      default_name=excluded.default_name, default_od=excluded.default_od,
      default_custom_type=excluded.default_custom_type, default_min_id=excluded.default_min_id,
      french_designation=excluded.french_designation
  `).run(t);
}

export function upsertHistory(h: any): void {
  getDb().prepare(`
    INSERT OR REPLACE INTO well_history (id, well_id, folio, snapshot, created_at)
    VALUES (@id, @well_id, @folio, @snapshot, @created_at)
  `).run({ ...h, snapshot: typeof h.snapshot === "string" ? h.snapshot : JSON.stringify(h.snapshot) });
}
