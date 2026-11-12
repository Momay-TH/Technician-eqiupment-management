-- ============================================================
-- Seed: permissions, catalog, status transitions
-- ============================================================

INSERT INTO permissions (key, label_th, label_en, "group") VALUES
  ('equipment:read',        'ดูอุปกรณ์',              'View equipment',        'equipment'),
  ('equipment:create',      'เพิ่มอุปกรณ์',            'Create equipment',      'equipment'),
  ('equipment:update',      'แก้ไขอุปกรณ์',            'Update equipment',      'equipment'),
  ('equipment:archive',     'เก็บ/จำหน่ายอุปกรณ์',     'Archive/Dispose',       'equipment'),
  ('equipment:serial_edit', 'แก้ไข Serial Number',     'Edit serial number',    'equipment'),
  ('price:read',            'ดูราคา/มูลค่า',            'View price/value',      'equipment'),
  ('qr:print',              'พิมพ์ QR Label',          'Print QR labels',       'equipment'),
  ('checkout:create',       'สร้างใบเบิก',             'Create checkout',       'checkout'),
  ('checkout:approve',      'อนุมัติใบเบิก',           'Approve checkout',      'checkout'),
  ('checkout:return',       'รับคืนอุปกรณ์',           'Return equipment',      'checkout'),
  ('checkout:read_all',     'ดูใบเบิกทั้งหมด',          'View all checkouts',    'checkout'),
  ('reports:read',          'ดูรายงาน',                'View reports',          'reports'),
  ('users:manage',          'จัดการผู้ใช้',            'Manage users',          'users'),
  ('permissions:manage',    'จัดการสิทธิ์',            'Manage permissions',    'users'),
  ('settings:manage',       'จัดการตั้งค่า/ข้อมูลหลัก', 'Manage settings',       'system'),
  ('audit:read',            'ดู Audit Log',            'View audit log',        'system')
ON CONFLICT (key) DO UPDATE SET
  label_th = excluded.label_th,
  label_en = excluded.label_en,
  "group" = excluded."group";

-- categories
INSERT INTO categories (id, code, name, description, icon, sort_order) VALUES
  (lower(hex(randomblob(16))), 'CCTV', 'CCTV',        'ระบบกล้องวงจรปิด',        'camera', 1),
  (lower(hex(randomblob(16))), 'ACC',  'Access Control','ระบบควบคุมการเข้าออก',   'key',    2),
  (lower(hex(randomblob(16))), 'ALM',  'Alarm',       'ระบบสัญญาณแจ้งเหตุ',      'bell',   3)
ON CONFLICT (code) DO NOTHING;

-- device types
INSERT INTO device_types (id, category_id, code, name) VALUES
  (lower(hex(randomblob(16))), (SELECT id FROM categories WHERE code = 'CCTV'), 'CAM', 'กล้องวงจรปิด'),
  (lower(hex(randomblob(16))), (SELECT id FROM categories WHERE code = 'CCTV'), 'DVR', 'DVR'),
  (lower(hex(randomblob(16))), (SELECT id FROM categories WHERE code = 'CCTV'), 'NVR', 'NVR'),
  (lower(hex(randomblob(16))), (SELECT id FROM categories WHERE code = 'CCTV'), 'HDD', 'ฮาร์ดดิสก์'),
  (lower(hex(randomblob(16))), (SELECT id FROM categories WHERE code = 'CCTV'), 'SW', 'สวิตช์/อุปกรณ์เครือข่าย'),
  (lower(hex(randomblob(16))), (SELECT id FROM categories WHERE code = 'ACC'), 'PANEL', 'Control Panel'),
  (lower(hex(randomblob(16))), (SELECT id FROM categories WHERE code = 'ACC'), 'READER', 'Card Reader'),
  (lower(hex(randomblob(16))), (SELECT id FROM categories WHERE code = 'ACC'), 'LOCK', 'Electronic Lock'),
  (lower(hex(randomblob(16))), (SELECT id FROM categories WHERE code = 'ACC'), 'EXIT', 'Exit Button'),
  (lower(hex(randomblob(16))), (SELECT id FROM categories WHERE code = 'ACC'), 'PSU', 'Power Supply'),
  (lower(hex(randomblob(16))), (SELECT id FROM categories WHERE code = 'ALM'), 'APANEL', 'Alarm Panel'),
  (lower(hex(randomblob(16))), (SELECT id FROM categories WHERE code = 'ALM'), 'MOTION', 'Motion Sensor'),
  (lower(hex(randomblob(16))), (SELECT id FROM categories WHERE code = 'ALM'), 'DOOR', 'Door/Window Sensor'),
  (lower(hex(randomblob(16))), (SELECT id FROM categories WHERE code = 'ALM'), 'SIREN', 'Siren'),
  (lower(hex(randomblob(16))), (SELECT id FROM categories WHERE code = 'ALM'), 'KEYPAD', 'Keypad')
ON CONFLICT (code) DO NOTHING;

-- status transitions
INSERT INTO equipment_status_transitions (from_status, to_status, allowed_roles) VALUES
  ('in_stock','in_vehicle','["admin","manager"]'),
  ('in_stock','at_site','["admin","manager"]'),
  ('in_stock','under_repair','["admin","manager"]'),
  ('in_stock','damaged_pending_dispose','["admin","manager"]'),
  ('in_stock','disposed','["admin","manager"]'),
  ('in_vehicle','in_stock','["admin","manager"]'),
  ('in_vehicle','at_site','["admin","manager"]'),
  ('in_vehicle','under_repair','["admin","manager"]'),
  ('in_vehicle','damaged_pending_dispose','["admin","manager"]'),
  ('at_site','in_vehicle','["admin","manager"]'),
  ('at_site','in_stock','["admin","manager"]'),
  ('at_site','under_repair','["admin","manager"]'),
  ('at_site','damaged_pending_dispose','["admin","manager"]'),
  ('under_repair','in_stock','["admin","manager"]'),
  ('under_repair','at_site','["admin","manager"]'),
  ('under_repair','damaged_pending_dispose','["admin","manager"]'),
  ('under_repair','disposed','["admin","manager"]'),
  ('damaged_pending_dispose','under_repair','["admin","manager"]'),
  ('damaged_pending_dispose','in_stock','["admin","manager"]'),
  ('damaged_pending_dispose','disposed','["admin","manager"]')
ON CONFLICT (from_status, to_status) DO NOTHING;

-- default locations
INSERT INTO locations (id, name, type, code) VALUES
  (lower(hex(randomblob(16))), 'คลังหลัก', 'warehouse', 'WH-01'),
  (lower(hex(randomblob(16))), 'ศูนย์บริการ 1', 'branch', 'BR-01'),
  (lower(hex(randomblob(16))), 'รถบริการ 1', 'vehicle', 'VH-01')
ON CONFLICT (code) DO NOTHING;
