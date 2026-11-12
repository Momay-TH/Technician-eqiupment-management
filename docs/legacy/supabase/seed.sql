-- ============================================================
-- Seed: permissions, catalog, status transitions
-- ============================================================

insert into public.permissions (key, label_th, label_en, "group") values
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
on conflict (key) do update
  set label_th = excluded.label_th,
      label_en = excluded.label_en,
      "group" = excluded."group";

-- categories
insert into public.categories (code, name, description, icon, sort_order) values
  ('CCTV', 'CCTV',        'ระบบกล้องวงจรปิด',        'camera', 1),
  ('ACC',  'Access Control','ระบบควบคุมการเข้าออก',   'key',    2),
  ('ALM',  'Alarm',       'ระบบสัญญาณแจ้งเหตุ',      'bell',   3)
on conflict (code) do nothing;

-- device types
with c as (select id, code from public.categories)
insert into public.device_types (category_id, code, name)
select c.id, v.code, v.name
from c
join (values
  ('CCTV','CAM','กล้องวงจรปิด'),
  ('CCTV','DVR','DVR'),
  ('CCTV','NVR','NVR'),
  ('CCTV','HDD','ฮาร์ดดิสก์'),
  ('CCTV','SW','สวิตช์/อุปกรณ์เครือข่าย'),
  ('ACC','PANEL','Control Panel'),
  ('ACC','READER','Card Reader'),
  ('ACC','LOCK','Electronic Lock'),
  ('ACC','EXIT','Exit Button'),
  ('ACC','PSU','Power Supply'),
  ('ALM','APANEL','Alarm Panel'),
  ('ALM','MOTION','Motion Sensor'),
  ('ALM','DOOR','Door/Window Sensor'),
  ('ALM','SIREN','Siren'),
  ('ALM','KEYPAD','Keypad')
) as v(cat, code, name) on v.cat = c.code
on conflict (code) do nothing;

-- status transitions
insert into public.equipment_status_transitions (from_status, to_status, allowed_roles) values
  ('in_stock','in_vehicle','{admin,manager}'),
  ('in_stock','at_site','{admin,manager}'),
  ('in_stock','under_repair','{admin,manager}'),
  ('in_stock','damaged_pending_dispose','{admin,manager}'),
  ('in_stock','disposed','{admin,manager}'),
  ('in_vehicle','in_stock','{admin,manager}'),
  ('in_vehicle','at_site','{admin,manager}'),
  ('in_vehicle','under_repair','{admin,manager}'),
  ('in_vehicle','damaged_pending_dispose','{admin,manager}'),
  ('at_site','in_vehicle','{admin,manager}'),
  ('at_site','in_stock','{admin,manager}'),
  ('at_site','under_repair','{admin,manager}'),
  ('at_site','damaged_pending_dispose','{admin,manager}'),
  ('under_repair','in_stock','{admin,manager}'),
  ('under_repair','at_site','{admin,manager}'),
  ('under_repair','damaged_pending_dispose','{admin,manager}'),
  ('under_repair','disposed','{admin,manager}'),
  ('damaged_pending_dispose','under_repair','{admin,manager}'),
  ('damaged_pending_dispose','in_stock','{admin,manager}'),
  ('damaged_pending_dispose','disposed','{admin,manager}')
on conflict (from_status, to_status) do nothing;

-- default locations
insert into public.locations (name, type, code) values
  ('คลังหลัก', 'warehouse', 'WH-01'),
  ('ศูนย์บริการ 1', 'branch', 'BR-01'),
  ('รถบริการ 1', 'vehicle', 'VH-01')
on conflict (code) do nothing;
