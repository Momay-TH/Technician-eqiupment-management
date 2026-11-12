/* eslint-disable @typescript-eslint/no-explicit-any */
import { getDB } from "@/lib/db";

export type ModelOption = {
  id: string;
  name: string;
  brandName: string;
  deviceTypeName: string;
  categoryName: string;
  referencePrice: number | null;
};

export type SimpleOption = { id: string; name: string };

export async function getFormOptions() {
  const db = getDB();

  const [modelsRes, locationsRes, sitesRes, techsRes] = await Promise.all([
    db
      .prepare(
        `SELECT m.id, m.name, m.reference_price,
                b.name AS brand_name, dt.name AS device_type_name, c.name AS category_name
         FROM models m
         JOIN brands b ON b.id = m.brand_id
         JOIN device_types dt ON dt.id = m.device_type_id
         JOIN categories c ON c.id = dt.category_id
         WHERE m.is_archived = 0
         ORDER BY m.name`,
      )
      .all(),
    db.prepare("SELECT id, name FROM locations WHERE is_active = 1 ORDER BY name").all(),
    db.prepare("SELECT id, name FROM customer_sites WHERE is_active = 1 ORDER BY name").all(),
    db.prepare("SELECT id, name FROM users WHERE role = 'technician' AND is_active = 1 ORDER BY name").all(),
  ]);

  const models: ModelOption[] = ((modelsRes as { results?: any[] }).results ?? []).map(
    (m) => ({
      id: m.id,
      name: m.name,
      brandName: m.brand_name ?? "",
      deviceTypeName: m.device_type_name ?? "",
      categoryName: m.category_name ?? "",
      referencePrice: m.reference_price,
    }),
  );

  return {
    models,
    locations: ((locationsRes as { results?: any[] }).results ?? []) as SimpleOption[],
    sites: ((sitesRes as { results?: any[] }).results ?? []) as SimpleOption[],
    technicians: ((techsRes as { results?: any[] }).results ?? []) as SimpleOption[],
  };
}
