// Shared vehicle-size categories, used wherever vehicle details are captured.
export const VEHICLE_TYPES = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
  { value: 'extra_large', label: 'Extra Large' },
];

export const vehicleTypeLabel = (v) =>
  VEHICLE_TYPES.find((t) => t.value === v)?.label || '';

export default VEHICLE_TYPES;
