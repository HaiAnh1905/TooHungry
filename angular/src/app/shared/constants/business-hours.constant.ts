export interface RestaurantBusinessHoursConfig {
  OPEN_HOUR: number;              // 9 (09:00)
  CLOSE_HOUR: number;             // 23 (23:00)
  MORNING_SHIFT_START: number;    // 9 (09:00)
  MORNING_SHIFT_END: number;      // 15 (15:00)
  EVENING_SHIFT_START: number;    // 15 (15:00)
  EVENING_SHIFT_END: number;      // 23 (23:00)
}

export const RESTAURANT_BUSINESS_HOURS: RestaurantBusinessHoursConfig = {
  OPEN_HOUR: 9,
  CLOSE_HOUR: 23,
  MORNING_SHIFT_START: 9,
  MORNING_SHIFT_END: 15,
  EVENING_SHIFT_START: 15,
  EVENING_SHIFT_END: 23,
};
